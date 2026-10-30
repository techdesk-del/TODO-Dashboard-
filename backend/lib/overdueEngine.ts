/**
 * lib/overdueEngine.ts — Flowchart 21: Overdue and No-Reason Auto-Flag Engine
 *
 * Implements the complete automated governance routine:
 * 1. Hourly check triggers (or manual on-demand trigger)
 * 2. Fetch tasks not Completed and not Cancelled
 * 3. Evaluate if Due Date has passed
 *    - If No: No flag applied
 *    - If Yes: Apply Overdue auto-flag
 * 4. Check if Reason is recorded
 *    - If Yes: Keep Overdue flag only (clear pendingNoReason)
 *    - If No: Apply Pending No Reason auto-flag
 * 5. Notify assignee and reporting manager (with 24h rate-limit debounce)
 * 6. Include in next morning digest
 * 7. Check if overdue beyond threshold days (default 3 days)
 *    - If Yes: Escalate to reporting manager & log audit trail
 *    - If No: Continue monitoring
 */

import connectDB from './db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { getTodayStr } from '@/shared/lib/dateUtils';
import { sendOverdueAutoFlagEmail } from './email';
import type { Task, TeamMember } from '@/types';

export interface OverdueEvaluationResult {
  totalPendingEvaluated: number;
  overdueCount: number;
  pendingNoReasonCount: number;
  overdueWithReasonCount: number;
  newlyFlaggedCount: number;
  autoEscalatedCount: number;
  notificationsDispatched: number;
  timestamp: string;
}

// Process-level mutex to prevent concurrent overlapping runs within the same server instance
let isEvaluationRunning = false;

export async function runOverdueAndNoReasonEvaluation(options?: {
  thresholdDays?: number;
  sendNotifications?: boolean;
  baseUrl?: string;
}): Promise<OverdueEvaluationResult> {
  if (isEvaluationRunning) {
    console.log('[Overdue Engine] Evaluation already in progress in this process, skipping duplicate concurrent trigger.');
    return {
      totalPendingEvaluated: 0,
      overdueCount: 0,
      pendingNoReasonCount: 0,
      overdueWithReasonCount: 0,
      newlyFlaggedCount: 0,
      autoEscalatedCount: 0,
      notificationsDispatched: 0,
      timestamp: new Date().toISOString(),
    };
  }

  isEvaluationRunning = true;
  try {
    await connectDB();

    const thresholdDays = options?.thresholdDays ?? 3;
    const sendNotifications = options?.sendNotifications ?? true;
    const baseUrl = options?.baseUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://todo-dashboard-rhvx.vercel.app';

    const todayStr = getTodayStr();
    const todayTime = new Date(todayStr).getTime();
    const nowIso = new Date().toISOString();
    const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch tasks not Completed and not Cancelled (Flowchart 21 Step 2)
    const pendingTasks = await TaskModel.find({
      status: { $nin: ['Done', 'Cancelled'] },
    }).exec();

    // Load active members roster for reporting manager resolution
    const members = await MemberModel.find({}).lean().exec() as unknown as TeamMember[];
    const memberMap = new Map<string, TeamMember>();
    members.forEach(m => {
      if (m.id) memberMap.set(m.id.toLowerCase(), m);
      if (m.email) memberMap.set(m.email.toLowerCase(), m);
      if (m.name) memberMap.set(m.name.toLowerCase(), m);
    });

    let overdueCount = 0;
    let pendingNoReasonCount = 0;
    let overdueWithReasonCount = 0;
    let newlyFlaggedCount = 0;
    let autoEscalatedCount = 0;
    let notificationsDispatched = 0;

    for (const task of pendingTasks) {
      const effectiveDeadline = (task.dueDate && task.dueDate.trim().length > 0) ? task.dueDate.trim() : task.scheduledDate;
      const isDuePassed = Boolean(effectiveDeadline && effectiveDeadline < todayStr);

      // Diamond: Due date passed?
      if (!isDuePassed) {
        // Branch: "No -> No flag applied -> End"
        if (task.isOverdue || task.isPendingNoReason) {
          task.isOverdue = false;
          task.isPendingNoReason = false;
          task.overdueDays = 0;
          await task.save();
        }
        continue;
      }

      // Branch: "Yes -> Apply Overdue auto-flag"
      const wasOverdueBefore = task.isOverdue;
      const taskTime = new Date(effectiveDeadline).getTime();
      const diffDays = Math.max(1, Math.floor((todayTime - taskTime) / (1000 * 60 * 60 * 24)));

      task.isOverdue = true;
      task.overdueDays = diffDays;
      if (!task.overdueFlaggedAt) {
        task.overdueFlaggedAt = nowIso;
        newlyFlaggedCount++;
      }
      overdueCount++;

      // Diamond: Reason recorded?
      const hasRecordedReason = Boolean(
        (task.delayReason && task.delayReason.trim().length > 0) ||
        (task.pastDueReason && task.pastDueReason.trim().length > 0)
      );

      const activeReason = task.delayReason?.trim() || task.pastDueReason?.trim();

      if (hasRecordedReason) {
        // Branch: "Yes -> Keep Overdue flag only"
        task.isPendingNoReason = false;
        overdueWithReasonCount++;
      } else {
        // Branch: "No -> Apply Pending No Reason auto-flag"
        task.isPendingNoReason = true;
        pendingNoReasonCount++;
      }

      // Node: "Notify assignee and reporting manager"
      // Rate limit notifications to once every 24 hours per task to avoid spamming on hourly runs
      const lastNotified = task.overdueNotifiedAt ? new Date(task.overdueNotifiedAt).getTime() : 0;
      const hoursSinceNotification = (Date.now() - lastNotified) / (1000 * 60 * 60);
      const shouldDispatchNotification = sendNotifications && (!task.overdueNotifiedAt || hoursSinceNotification >= 24);

      // Resolve primary assignee details
      const primaryAssignee = task.assignees[0];
      const assigneeMember = primaryAssignee
        ? (memberMap.get(primaryAssignee.id?.toLowerCase()) || memberMap.get(primaryAssignee.email?.toLowerCase()))
        : undefined;

      const assigneeEmail = primaryAssignee?.email || assigneeMember?.email;
      const assigneeName = primaryAssignee?.name || assigneeMember?.name || 'Assignee';

      // Resolve reporting manager
      let reportingManagerName = assigneeMember?.manager || 'Reporting Manager';
      let reportingManagerEmail = assigneeMember?.managerEmail;
      let reportingManagerId = assigneeMember?.managerId;

      if (!reportingManagerEmail && assigneeMember?.managerId) {
        const mgr = memberMap.get(assigneeMember.managerId.toLowerCase());
        if (mgr) {
          reportingManagerName = mgr.name;
          reportingManagerEmail = mgr.email;
          reportingManagerId = mgr.id;
        }
      }

      // Diamond: "Overdue beyond threshold days?"
      let didEscalateNow = false;
      if (diffDays >= thresholdDays && task.status !== 'Escalated' && !task.autoEscalatedToManager) {
        // Branch: "Yes -> Escalate to reporting manager"
        task.status = 'Escalated';
        task.escalatedTo = reportingManagerName;
        task.escalatedToId = reportingManagerId || undefined;
        task.escalatedAt = nowIso;
        task.escalationReason = `Auto-escalated: Overdue by ${diffDays} days beyond threshold (${thresholdDays}d)`;
        task.autoEscalatedToManager = true;
        task.notes = `${task.notes ? task.notes + ' | ' : ''}Auto-escalated to ${reportingManagerName} due to ${diffDays}d overdue threshold breach.`;

        didEscalateNow = true;
        autoEscalatedCount++;

        // Log immutable audit entry for compliance
        await AuditLogModel.create({
          id: `audit-overdue-esc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: nowIso,
          taskId: task.id,
          taskTitle: task.title,
          action: 'ESCALATED',
          fieldChanged: 'Auto-Escalation Engine',
          oldValue: 'Overdue Pending',
          newValue: `Escalated to ${reportingManagerName}`,
          actor: 'Hourly Governance Cron',
          actorRole: 'SUPER_ADMIN',
          ipAddress: '127.0.0.1',
          deviceInfo: 'UrbanGaon Automated Monitor Daemon',
          notes: `Deliverable #${task.id} exceeded ${thresholdDays}-day overdue threshold (${diffDays} days overdue). Reason: ${activeReason || 'None documented'}.`,
        }).catch(err => console.warn('[Audit Log Error]', err));
      }

      if (shouldDispatchNotification && assigneeEmail) {
        // ATOMIC DATABASE CLAIM (Critical concurrency fix):
        // Atomically claim the notification window in MongoDB before dispatching SMTP email.
        // If another process, thread, or worker concurrently attempts to notify for this task,
        // modifiedCount will be 0, preventing any duplicate email from being sent.
        const claimResult = await TaskModel.updateOne(
          {
            _id: task._id,
            $or: [
              { overdueNotifiedAt: { $exists: false } },
              { overdueNotifiedAt: null },
              { overdueNotifiedAt: { $lt: twentyFourHoursAgoIso } }
            ]
          },
          {
            $set: { overdueNotifiedAt: nowIso }
          }
        );

        if (claimResult.modifiedCount > 0) {
          try {
            await sendOverdueAutoFlagEmail({
              toEmail: assigneeEmail,
              toName: assigneeName,
              managerEmail: reportingManagerEmail,
              managerName: reportingManagerName,
              taskId: task.id,
              taskTitle: task.title,
              scheduledDate: effectiveDeadline,
              daysOverdue: diffDays,
              hasReason: hasRecordedReason,
              delayReason: activeReason,
              isEscalated: didEscalateNow || task.status === 'Escalated',
              baseUrl,
            });
            task.overdueNotifiedAt = nowIso;
            notificationsDispatched++;
          } catch (emailErr) {
            console.warn(`[Overdue Engine] Notification failed for #${task.id}:`, emailErr);
            // Revert claim on network failure so subsequent routines can retry
            await TaskModel.updateOne(
              { _id: task._id, overdueNotifiedAt: nowIso },
              { $set: { overdueNotifiedAt: lastNotified > 0 ? new Date(lastNotified).toISOString() : null } }
            ).catch(() => {});
          }
        } else {
          console.log(`[Overdue Engine] Task #${task.id} was already notified within 24h by another process, skipped duplicate.`);
        }
      }

      await task.save();
    }

  // Audit evaluation summary if any tasks were newly flagged or escalated
  if (newlyFlaggedCount > 0 || autoEscalatedCount > 0) {
    await AuditLogModel.create({
      id: `audit-overdue-run-${Date.now()}`,
      timestamp: nowIso,
      action: 'STATUS_CHANGE',
      fieldChanged: 'Hourly Overdue Engine',
      oldValue: 'Routine Check',
      newValue: `Overdue: ${overdueCount} (No Reason: ${pendingNoReasonCount}, Escalated: ${autoEscalatedCount})`,
      actor: 'System Hourly Governance Daemon',
      actorRole: 'SUPER_ADMIN',
      ipAddress: '127.0.0.1',
      deviceInfo: 'node-cron Overdue Routine',
      notes: `Automated hourly evaluation scanned ${pendingTasks.length} pending deliverables. ${newlyFlaggedCount} new overdue flags, ${autoEscalatedCount} auto-escalated to reporting managers.`,
    }).catch(err => console.warn('[Audit Log Error]', err));
  }

  console.log(`[Overdue Engine] Scanned ${pendingTasks.length} tasks. Overdue: ${overdueCount} (${pendingNoReasonCount} pending reason, ${overdueWithReasonCount} with reason). Escalated: ${autoEscalatedCount}. Notifications: ${notificationsDispatched}.`);

    return {
      totalPendingEvaluated: pendingTasks.length,
      overdueCount,
      pendingNoReasonCount,
      overdueWithReasonCount,
      newlyFlaggedCount,
      autoEscalatedCount,
      notificationsDispatched,
      timestamp: nowIso,
    };
  } finally {
    isEvaluationRunning = false;
  }
}
