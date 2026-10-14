/**
 * app/api/reminders/digest/route.ts
 * POST /api/reminders/digest — Send morning email digest via SMTP
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { sendMorningDigestEmail } from '@/lib/email';
import { getTodayStr, formatDateDisplay } from '@/lib/dateUtils';
import { isNonWorkingDay } from '@/lib/holidayData';
import type { Task } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email;
    const targetName = body.name;

    const todayStr = getTodayStr();
    const displayDate = formatDateDisplay(todayStr);

    // Enforce UrbanGaon FY 2026-27 Policy: Suppress reminder emails on Holidays & Sundays (Flowcharts 13 & 23)
    const nonWorking = isNonWorkingDay(todayStr);
    const isManualForce = body.force === true;

    if (nonWorking.isNonWorking && !isManualForce) {
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
        deviceInfo: 'Node.js Holiday Policy Engine (FC 13 & 23)',
        notes: `Zero emails dispatched to staff. Today is ${nonWorking.reason} (Approved by Mr. Sukh Sagar Singh / Prepared by Varun Mudgal).`,
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

    const allTasks = (await TaskModel.find({ status: { $ne: 'Cancelled' } }).lean().exec()) as unknown as Task[];

    let recipients: Array<{ name: string; email: string }> = [];

    if (targetEmail) {
      recipients = [{ name: targetName || 'Team Member', email: targetEmail }];
    } else {
      const members = await MemberModel.find({ status: 'ACTIVE' }).lean().exec();
      recipients = members.map(m => ({ name: m.name, email: m.email }));
    }

    const results = [];

    for (const recipient of recipients) {
      const userTasks = allTasks.filter(t =>
        t.assignees.some(a => a.email === recipient.email || a.name.toLowerCase().includes(recipient.name.toLowerCase()))
      );

      const overdue = userTasks.filter(t => t.scheduledDate < todayStr && t.status !== 'Done');
      const today = userTasks.filter(t => t.scheduledDate === todayStr && t.status !== 'Done');
      const upcoming = userTasks.filter(t => t.scheduledDate > todayStr && t.status !== 'Done');

      const sendResult = await sendMorningDigestEmail({
        toEmail: recipient.email,
        toName: recipient.name,
        overdueTasks: overdue,
        todayTasks: today,
        upcomingTasks: upcoming,
        dateString: displayDate,
      });

      results.push({
        email: recipient.email,
        ...sendResult,
      });

      // Audit log entry
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
        notes: sendResult.isTestAccount
          ? `Dispatched via Ethereal test inbox: ${sendResult.previewUrl || 'preview ready'}`
          : `Live SMTP delivered to ${recipient.email}`,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
      message: `Dispatched digest to ${results.length} recipient(s).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/reminders/digest error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
