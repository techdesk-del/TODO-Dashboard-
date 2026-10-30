/**
 * lib/digestEngine.ts — Core Morning Email Digest Dispatch Engine
 * 
 * Strict Implementation of Flowchart D (Automated Digest / Reminder Cron Flow):
 * 1. Clock reaches 08:30 AM (IST) or triggered manually/via API.
 * 2. Checks working day vs holiday/Sunday (suppresses unless force=true).
 * 3. Fetches all pending commitments from MongoDB Atlas and groups by assignee.
 * 4. Categorizes into Overdue, Due Today, and Upcoming with direct task links.
 * 5. Sends personalized digests via SMTP with 3 retries.
 * 6. Logs immutable AuditLog entries for every dispatch.
 * 7. Dispatches Admin summary for chronic delays (>3 days) & failures.
 */

import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { SystemConfigModel } from '@/models/SystemConfig';
import { sendMorningDigestEmail, sendAdminDigestSummaryEmail, ChronicDelayItem } from '@/lib/email';
import { getTodayStr, formatDateDisplay } from '@/lib/dateUtils';
import { isNonWorkingDay } from '@/lib/holidayData';
import { OFFICIAL_ROSTER } from '@/lib/rosterData';
import type { Task, Role } from '@/types';

export interface DigestOptions {
  targetEmail?: string;
  targetName?: string;
  force?: boolean;
  origin?: string;
  actor?: string;
  actorRole?: Role;
}

export interface DigestResult {
  success: boolean;
  suppressed?: boolean;
  reason?: string;
  isSunday?: boolean;
  holiday?: any;
  count: number;
  failedCount: number;
  chronicDelaysCount: number;
  results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    isTestAccount?: boolean;
    previewUrl?: string | null;
  }>;
  failedDeliveries: Array<{ email: string; name: string; error: string }>;
  chronicDelays: ChronicDelayItem[];
  adminSummary: any;
  message: string;
}

export async function runMorningDigest(options: DigestOptions = {}): Promise<DigestResult> {
  await connectDB();

  const todayStr = getTodayStr();
  const displayDate = formatDateDisplay(todayStr);

  // Fetch configured working days from SystemConfig in MongoDB
  let configuredWorkingDays: string[] | undefined = undefined;
  try {
    const cfgDoc = await SystemConfigModel.findOne({ key: 'global_system_config' }).lean();
    if (cfgDoc?.config?.workingDays && Array.isArray(cfgDoc.config.workingDays)) {
      configuredWorkingDays = cfgDoc.config.workingDays;
    }
  } catch (err) {
    console.warn('[DigestEngine] Could not load system config from DB:', err);
  }

  // Flowchart D: "Is today a working day?"
  const nonWorking = isNonWorkingDay(todayStr, configuredWorkingDays);
  const isForce = Boolean(options.force);

  if (nonWorking.isNonWorking && !isForce) {
    await AuditLogModel.create({
      id: `audit-email-skip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor: options.actor || 'Automated 08:30 AM Digest Engine',
      actorRole: options.actorRole || 'SUPER_ADMIN',
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Morning Digest Suppressed (Holiday / Sunday)',
      oldValue: 'Scheduled Email Dispatch',
      newValue: `Auto-Suppressed: ${nonWorking.reason}`,
      ipAddress: '127.0.0.1',
      deviceInfo: 'Holiday Policy Engine',
      notes: `Zero emails dispatched to staff. Today is ${nonWorking.reason}.`,
    }).catch(() => {});

    return {
      success: true,
      suppressed: true,
      reason: nonWorking.reason,
      isSunday: nonWorking.isSunday,
      holiday: nonWorking.holiday,
      count: 0,
      failedCount: 0,
      chronicDelaysCount: 0,
      results: [],
      failedDeliveries: [],
      chronicDelays: [],
      adminSummary: null,
      message: `Morning digest auto-suppressed: Today is ${nonWorking.reason}. No reminder emails dispatched.`,
    };
  }

  // Fetch all pending deliverables from MongoDB Atlas
  const allPendingTasks = (await TaskModel.find({
    status: { $nin: ['Done', 'Cancelled'] }
  }).lean().exec()) as unknown as Task[];

  // Fetch active team members from MongoDB Atlas
  let allMembers = await MemberModel.find({
    status: { $nin: ['DEACTIVATED'] }
  }).lean().exec();

  // Fallback to OFFICIAL_ROSTER if Member collection is empty
  if (!allMembers || allMembers.length === 0) {
    allMembers = OFFICIAL_ROSTER as any[];
  }

  // Resolve target recipients
  let recipients: Array<{
    name: string;
    email: string;
    id?: string;
    managerId?: string;
    manager?: string;
    managerEmail?: string;
  }> = [];

  if (options.targetEmail) {
    const cleanTargetEmail = options.targetEmail.toLowerCase().trim();
    const matched = allMembers.find(m => m.email?.toLowerCase().trim() === cleanTargetEmail);
    recipients = [{
      name: options.targetName || matched?.name || 'Team Member',
      email: cleanTargetEmail,
      id: matched?.id,
      managerId: matched?.managerId,
      manager: matched?.manager,
      managerEmail: matched?.managerEmail
    }];
  } else {
    // All active members
    recipients = allMembers.map(m => ({
      name: m.name,
      email: (m.email || '').toLowerCase().trim(),
      id: m.id,
      managerId: m.managerId,
      manager: m.manager,
      managerEmail: m.managerEmail
    })).filter(r => Boolean(r.email));
  }

  const successfulResults: any[] = [];
  const failedDeliveries: Array<{ email: string; name: string; error: string }> = [];
  const chronicDelays: ChronicDelayItem[] = [];
  const origin = options.origin || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://todo-dashboard-rhvx.vercel.app';

  // Process each employee
  for (const recipient of recipients) {
    const cleanEmail = recipient.email.toLowerCase().trim();
    const cleanName = recipient.name.toLowerCase().trim();

    // Match tasks where recipient is assignee
    const userTasks = allPendingTasks.filter(t =>
      t.assignees?.some(a => 
        (a.email && a.email.toLowerCase().trim() === cleanEmail) ||
        (a.name && a.name.toLowerCase().trim() === cleanName) ||
        (a.id && recipient.id && a.id === recipient.id)
      )
    );

    // Skip employees who have zero pending tasks
    if (userTasks.length === 0) {
      continue;
    }

    // Helper to determine task's effective deadline
    const getDeadline = (t: any) => (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;

    // Categorize into Overdue, Today, Upcoming based on real commitment deadline
    const overdue = userTasks.filter(t => {
      const dl = getDeadline(t);
      return t.isOverdue || Boolean(dl && dl < todayStr);
    });

    const today = userTasks.filter(t => {
      const dl = getDeadline(t);
      const isOver = t.isOverdue || Boolean(dl && dl < todayStr);
      if (isOver) return false;
      return dl === todayStr;
    });

    const upcoming = userTasks.filter(t => {
      const dl = getDeadline(t);
      const isOver = t.isOverdue || Boolean(dl && dl < todayStr);
      if (isOver) return false;
      return Boolean(dl && dl > todayStr);
    });

    // Track chronic delays (overdue >= 3 days)
    const todayTime = new Date(todayStr).getTime();
    overdue.forEach(t => {
      const dl = getDeadline(t);
      const taskTime = new Date(dl).getTime();
      const diffDays = Math.max(1, Math.floor((todayTime - taskTime) / (1000 * 60 * 60 * 24)));
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

    // Send email with 3 retry attempts
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
        await new Promise(r => setTimeout(r, 150));
      }
    }

    if (sentSuccessfully) {
      successfulResults.push({
        email: recipient.email,
        ...sendResult,
      });

      await AuditLogModel.create({
        id: `audit-digest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: options.actor || 'Automated 08:30 AM Digest Engine',
        actorRole: options.actorRole || 'SUPER_ADMIN',
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Morning Email Digest Dispatched',
        oldValue: 'Pending Digest',
        newValue: `Sent to ${recipient.email} (Overdue: ${overdue.length}, Today: ${today.length}, Upcoming: ${upcoming.length})`,
        ipAddress: '127.0.0.1',
        deviceInfo: 'Node.js Gmail SMTP Transporter',
        notes: sendResult?.isTestAccount
          ? `Dispatched via Ethereal test inbox: ${sendResult.previewUrl || 'preview ready'}`
          : `Delivered live via corporate Gmail SMTP to ${recipient.email}`,
      }).catch(() => {});
    } else {
      failedDeliveries.push({
        email: recipient.email,
        name: recipient.name,
        error: lastError || 'All 3 retry attempts exhausted'
      });

      await AuditLogModel.create({
        id: `audit-digest-fail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: options.actor || 'Automated 08:30 AM Digest Engine',
        actorRole: options.actorRole || 'SUPER_ADMIN',
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Morning Email Digest Failed (3 Retries Exhausted)',
        oldValue: 'Retrying Dispatch',
        newValue: `Failed: ${recipient.email}`,
        ipAddress: '127.0.0.1',
        deviceInfo: 'Node.js SMTP Transporter',
        notes: `Delivery attempts failed for ${recipient.email}: ${lastError}.`,
      }).catch(() => {});
    }
  }

  // Send admin summary if any failures or chronic delays exist
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'ceo@urbangaon.com';
  let adminSummaryResult = null;

  if (failedDeliveries.length > 0 || chronicDelays.length > 0) {
    try {
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
        actor: options.actor || 'Automated 08:30 AM Digest Engine',
        actorRole: options.actorRole || 'SUPER_ADMIN',
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Admin Summary Email Dispatched',
        oldValue: 'Pending Cycle Summary',
        newValue: `Sent to ${adminEmail} (Failures: ${failedDeliveries.length}, Chronic Delays: ${chronicDelays.length})`,
        ipAddress: '127.0.0.1',
        deviceInfo: 'Node.js SMTP Transporter',
        notes: `Admin summary delivered. Copied ${adminSummaryResult?.managerCcCount || 0} reporting managers on chronic delays.`,
      }).catch(() => {});
    } catch (adminErr) {
      console.warn('[Admin Digest Summary Warning]', adminErr);
    }
  }

  return {
    success: true,
    count: successfulResults.length,
    failedCount: failedDeliveries.length,
    chronicDelaysCount: chronicDelays.length,
    results: successfulResults,
    failedDeliveries,
    chronicDelays,
    adminSummary: adminSummaryResult,
    message: `Dispatched morning digest to ${successfulResults.length} staff member(s). Failures: ${failedDeliveries.length}, Chronic delays: ${chronicDelays.length}.`,
  };
}
