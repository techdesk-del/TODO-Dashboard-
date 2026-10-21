/**
 * app/api/reminders/digest/route.ts
 * POST /api/reminders/digest — Send morning email digest via SMTP
 * 
 * Strict Implementation of Flowchart D (Automated Digest / Reminder Cron Flow):
 * 1. Clock reaches reminder time (default 08:30 AM)
 * 2. Working day check (suppresses on holidays & Sundays)
 * 3. Fetch all pending tasks & group by assignee
 * 4. Categorize tasks into Overdue, Due Today, Upcoming with direct task links
 * 5. Prompt for reasons on unreasoned overdue tasks
 * 6. Send email with up to 3 retries on failure
 * 7. Send summary to Admin of failures & chronic delays (>3 days overdue)
 * 8. Copy reporting managers on chronic delays
 * 9. Immutable Audit Log entries for every transition
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { sendMorningDigestEmail, sendAdminDigestSummaryEmail, ChronicDelayItem } from '@/lib/email';
import { getTodayStr, formatDateDisplay } from '@/lib/dateUtils';
import { isNonWorkingDay } from '@/lib/holidayData';
import type { Task } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      // body remains empty object if not JSON
    }
    const { searchParams } = new URL(req.url);
    const targetEmail = (body.email as string) || searchParams.get('email') || undefined;
    const targetName = (body.name as string) || searchParams.get('name') || undefined;

    const todayStr = getTodayStr();
    const displayDate = formatDateDisplay(todayStr);

    // Flowchart D Diamond 1: "is today a working day?"
    const nonWorking = isNonWorkingDay(todayStr);
    const isManualForce = body.force === true || searchParams.get('force') === 'true';

    if (nonWorking.isNonWorking && !isManualForce) {
      // Branch: "Skip reminder and log skip reason -> End"
      await AuditLogModel.create({
        id: `audit-email-skip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: 'Automated Dispatcher Engine',
        actorRole: 'SUPER_ADMIN',
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Morning Digest Suppressed (Holiday / Sunday)',
        oldValue: 'Scheduled Email Dispatch',
        newValue: `Auto-Suppressed: ${nonWorking.reason}`,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: 'Node.js Holiday Policy Engine (Flowchart D)',
        notes: `Zero emails dispatched to staff. Today is ${nonWorking.reason} (Approved by Mr. Sukh Sagar Singh).`,
      });

      return NextResponse.json({
        success: true,
        suppressed: true,
        reason: nonWorking.reason,
        isSunday: nonWorking.isSunday,
        holiday: nonWorking.holiday,
        message: `Morning digest auto-suppressed: Today is ${nonWorking.reason}. No reminder emails dispatched.`,
      });
    }

    // Branch: "Cron job triggers -> Fetch all pending tasks"
    const allPendingTasks = (await TaskModel.find({
      status: { $nin: ['Done', 'Cancelled'] }
    }).lean().exec()) as unknown as Task[];

    // Fetch active members to resolve manager info
    const allMembers = await MemberModel.find({ status: 'ACTIVE' }).lean().exec();

    let recipients: Array<{ name: string; email: string; id?: string; managerId?: string; manager?: string; managerEmail?: string }> = [];

    if (targetEmail) {
      const matched = allMembers.find(m => m.email.toLowerCase() === targetEmail.toLowerCase());
      recipients = [{
        name: targetName || matched?.name || 'Team Member',
        email: targetEmail,
        id: matched?.id,
        managerId: matched?.managerId,
        manager: matched?.manager,
        managerEmail: matched?.managerEmail
      }];
    } else {
      recipients = allMembers.map(m => ({
        name: m.name,
        email: m.email,
        id: m.id,
        managerId: m.managerId,
        manager: m.manager,
        managerEmail: m.managerEmail
      }));
    }

    const successfulResults = [];
    const failedDeliveries: Array<{ email: string; name: string; error: string }> = [];
    const chronicDelays: ChronicDelayItem[] = [];

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Flowchart D Loop: "For each employee with pending tasks"
    for (const recipient of recipients) {
      const userTasks = allPendingTasks.filter(t =>
        t.assignees.some(a => a.email === recipient.email || a.name.toLowerCase().includes(recipient.name.toLowerCase()))
      );

      // Only process employees with pending tasks
      if (userTasks.length === 0) continue;

      // Group tasks into Overdue, Due today and Upcoming per Flowchart 21 & D
      const overdue = userTasks.filter(t => t.isOverdue || t.scheduledDate < todayStr);
      const today = userTasks.filter(t => !t.isOverdue && t.scheduledDate === todayStr);
      const upcoming = userTasks.filter(t => !t.isOverdue && t.scheduledDate > todayStr);

      // Check for chronic delays (overdue by > 3 days)
      const todayTime = new Date(todayStr).getTime();
      overdue.forEach(t => {
        const taskTime = new Date(t.scheduledDate).getTime();
        const diffDays = Math.floor((todayTime - taskTime) / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) {
          chronicDelays.push({
            task: t,
            employeeName: recipient.name,
            employeeEmail: recipient.email,
            managerName: recipient.manager,
            managerEmail: recipient.managerEmail,
            daysOverdue: diffDays,
          });
        }
      });

      // Flowchart D: "Email sent successfully? No -> Retry up to 3 times"
      let sentSuccessfully = false;
      let lastError = '';
      let sendResult: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          sendResult = await sendMorningDigestEmail({
            toEmail: recipient.email,
            toName: recipient.name,
            overdueTasks: overdue,
            todayTasks: today,
            upcomingTasks: upcoming,
            dateString: displayDate,
            baseUrl: origin,
          });
          if (sendResult?.success) {
            sentSuccessfully = true;
            break;
          }
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : 'SMTP dispatch failed';
          // Small pause before retry
          await new Promise(r => setTimeout(r, 100));
        }
      }

      if (sentSuccessfully) {
        // Flowchart D: "Log as sent"
        successfulResults.push({
          email: recipient.email,
          ...sendResult,
        });

        await AuditLogModel.create({
          id: `audit-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          actor: 'Automated Dispatcher Engine',
          actorRole: 'SUPER_ADMIN',
          action: 'CONFIG_CHANGED',
          fieldChanged: 'Morning Email Digest Dispatched',
          oldValue: 'Pending Digest',
          newValue: `Sent to ${recipient.email} (Overdue: ${overdue.length}, Today: ${today.length})`,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          deviceInfo: 'Node.js SMTP Transporter',
          notes: sendResult?.isTestAccount
            ? `Dispatched via Ethereal test inbox: ${sendResult.previewUrl || 'preview ready'}`
            : `Live SMTP delivered to ${recipient.email}`,
        }).catch(() => {});
      } else {
        // Flowchart D: "Still failed? Yes -> Log as failed, add to Admin summary"
        failedDeliveries.push({
          email: recipient.email,
          name: recipient.name,
          error: lastError || 'All 3 retry attempts exhausted'
        });

        await AuditLogModel.create({
          id: `audit-email-fail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          actor: 'Automated Dispatcher Engine',
          actorRole: 'SUPER_ADMIN',
          action: 'CONFIG_CHANGED',
          fieldChanged: 'Morning Email Digest Failed (3 Retries Exhausted)',
          oldValue: 'Retrying Dispatch',
          newValue: `Failed: ${recipient.email}`,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          deviceInfo: 'Node.js SMTP Transporter',
          notes: `Delivery attempts failed for ${recipient.email}: ${lastError}. Added to Admin summary.`,
        }).catch(() => {});
      }
    }

    // Flowchart D End Block: "Send summary to Admin (failures and chronic delays) & Copy reporting manager on chronic delays"
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@urbangaon.com';
    let adminSummaryResult = null;

    if (failedDeliveries.length > 0 || chronicDelays.length > 0) {
      adminSummaryResult = await sendAdminDigestSummaryEmail({
        adminEmail,
        dateString: displayDate,
        totalPendingStaff: recipients.length,
        successfulSends: successfulResults.length,
        failedDeliveries,
        chronicDelays,
      });

      await AuditLogModel.create({
        id: `audit-admin-summary-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: 'Automated Dispatcher Engine',
        actorRole: 'SUPER_ADMIN',
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Admin Summary Email Dispatched',
        oldValue: 'Pending Cycle Summary',
        newValue: `Sent to ${adminEmail} (Failures: ${failedDeliveries.length}, Chronic Delays: ${chronicDelays.length})`,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: 'Node.js SMTP Transporter',
        notes: `Admin summary delivered. Copied ${adminSummaryResult?.managerCcCount || 0} reporting managers on chronic delays.`,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      count: successfulResults.length,
      failedCount: failedDeliveries.length,
      chronicDelaysCount: chronicDelays.length,
      results: successfulResults,
      failedDeliveries,
      chronicDelays,
      adminSummary: adminSummaryResult,
      message: `Dispatched digest to ${successfulResults.length} staff. Failures: ${failedDeliveries.length}, Chronic delays: ${chronicDelays.length}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/reminders/digest error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
