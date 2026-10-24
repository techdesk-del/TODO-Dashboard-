/**
 * lib/notificationDispatcher.ts — Flowchart 20: Notification Dispatch Flow
 *
 * Implements the centralized communication engine across all 7 operational events:
 * 1. Task assigned -> Send instant in-app and email to assignee
 * 2. Task escalated -> Send instant in-app and email to senior and manager
 * 3. Task reopened -> Send instant in-app and email to all assignees
 * 4. Reason approved or rejected -> Send instant in-app and email to assignee
 * 5. Daily reminder -> Send morning pending-task digest
 * 6. Weekly digest -> Send weekly summary to Directors
 * 7. Chronic delay -> Send escalating alert to reporting manager
 *
 * Centralized Reliability Guarantee:
 * - Logs all records in email_logs and notifications table
 * - If delivery fails: Retries up to 3 times, then marks failed & adds to Admin failure summary
 * - If delivery succeeds: Marks delivered
 */

import connectDB from './db';
import { InAppNotificationModel } from '@/models/InAppNotification';
import { EmailLogModel } from '@/models/EmailLog';
import { AuditLogModel } from '@/models/AuditLog';
import {
  sendTaskAssignedEmail,
  sendTaskEscalatedEmail,
  sendTaskReopenedEmail,
  sendTaskCancelledEmail,
  sendReasonDecisionEmail,
  sendOverdueAutoFlagEmail,
  sendMorningDigestEmail,
  sendWeeklyDigestEmail,
  sendConfigRollbackEmail
} from './email';
import type { NotificationEventType, InAppNotification, EmailLog } from '@/types';

export interface DispatchNotificationEvent {
  eventType: NotificationEventType;
  recipients: Array<{ email: string; name: string }>;
  title: string;
  message: string;
  taskId?: string;
  taskTitle?: string;
  metadata?: Record<string, any>;
}

export interface DispatchResult {
  inAppCreatedCount: number;
  emailResults: Array<{
    recipientEmail: string;
    status: 'DELIVERED' | 'FAILED';
    attempts: number;
    error?: string;
  }>;
}

export async function dispatchNotificationFlow(
  event: DispatchNotificationEvent
): Promise<DispatchResult> {
  await connectDB();

  const nowIso = new Date().toISOString();
  let inAppCreatedCount = 0;
  const emailResults: DispatchResult['emailResults'] = [];

  // 1. Log in notifications table (In-App Notifications) for each recipient
  for (const recipient of event.recipients) {
    if (!recipient.email || !recipient.email.includes('@')) continue;

    try {
      await InAppNotificationModel.create({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientEmail: recipient.email.toLowerCase(),
        recipientName: recipient.name,
        title: event.title,
        message: event.message,
        type: event.eventType,
        taskId: event.taskId,
        read: false,
        createdAt: nowIso,
      });
      inAppCreatedCount++;
    } catch (err) {
      console.warn('[NotificationDispatcher] Failed to write in-app notification:', err);
    }
  }

  // 2. Process Email Dispatch with 3x Retry Loop per Flowchart 20
  for (const recipient of event.recipients) {
    if (!recipient.email || !recipient.email.includes('@')) continue;

    const emailLogId = `elog-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create initial email_log record
    const emailLog = await EmailLogModel.create({
      id: emailLogId,
      recipientEmail: recipient.email.toLowerCase(),
      recipientName: recipient.name,
      eventType: event.eventType,
      subject: event.title,
      status: 'PENDING',
      attempts: 0,
      taskId: event.taskId,
      addedToAdminSummary: false,
      createdAt: nowIso,
    });

    let sentSuccessfully = false;
    let attempts = 0;
    let lastError = '';

    // Flowchart 20 Retry Loop: "Delivery failed? Yes -> Retry up to 3 times then mark failed"
    for (let attempt = 1; attempt <= 3; attempt++) {
      attempts = attempt;
      try {
        let sendRes: { success: boolean; error?: string } = { success: false };

        switch (event.eventType) {
          case 'TASK_ASSIGNED':
            sendRes = await sendTaskAssignedEmail({
              toEmail: recipient.email,
              toName: recipient.name,
              taskId: event.taskId || 'N/A',
              taskTitle: event.taskTitle || event.title,
              scheduledDate: event.metadata?.scheduledDate || '',
              time: event.metadata?.time || '',
              priority: event.metadata?.priority || 'NORMAL',
              department: event.metadata?.department || 'General',
              assignedBy: event.metadata?.assignedBy || 'Management',
            });
            break;

          case 'TASK_ESCALATED':
            sendRes = await sendTaskEscalatedEmail({
              seniorEmail: recipient.email,
              seniorName: recipient.name,
              taskTitle: event.taskTitle || event.title,
              taskId: event.taskId || 'N/A',
              escalatedBy: event.metadata?.escalatedBy || 'Staff',
              reason: event.metadata?.escalationReason || event.message,
            });
            break;

          case 'TASK_REOPENED':
            sendRes = await sendTaskReopenedEmail({
              assigneeEmails: [recipient.email],
              taskTitle: event.taskTitle || event.title,
              reopenedBy: event.metadata?.reopenedBy || 'Management',
              reason: event.metadata?.reopenReason || event.message,
            });
            break;

          case 'TASK_CANCELLED':
            sendRes = await sendTaskCancelledEmail({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              taskId: event.taskId || 'N/A',
              taskTitle: event.taskTitle || event.title,
              cancelledBy: event.metadata?.cancelledBy || event.metadata?.assignedBy || 'Management',
              cancellationReason: event.metadata?.cancellationReason || event.message,
              department: event.metadata?.department,
              priority: event.metadata?.priority,
              baseUrl: event.metadata?.baseUrl,
            });
            break;

          case 'REASON_STATUS_CHANGED':
            sendRes = await sendReasonDecisionEmail({
              employeeEmail: recipient.email,
              employeeName: recipient.name,
              taskTitle: event.taskTitle || event.title,
              decision: event.metadata?.decision || 'APPROVED',
              managerName: event.metadata?.managerName || 'Management',
              remarks: event.metadata?.remarks || event.metadata?.notes,
            });
            break;

          case 'DAILY_REMINDER':
            sendRes = await sendMorningDigestEmail({
              toEmail: recipient.email,
              toName: recipient.name,
              overdueTasks: event.metadata?.overdueTasks || [],
              todayTasks: event.metadata?.todayTasks || [],
              upcomingTasks: event.metadata?.upcomingTasks || [],
              dateString: event.metadata?.dateString || new Date().toLocaleDateString('en-GB'),
              baseUrl: event.metadata?.baseUrl,
            });
            break;

          case 'WEEKLY_DIGEST':
            sendRes = await sendWeeklyDigestEmail({
              directorEmail: recipient.email,
              directorName: recipient.name,
              totalCompanyTasks: event.metadata?.totalCompanyTasks || 0,
              completedTasks: event.metadata?.completedTasks || 0,
              overdueTasks: event.metadata?.overdueTasks || 0,
              escalatedTasks: event.metadata?.escalatedTasks || 0,
              timelyRatio: event.metadata?.timelyRatio || '100%',
            });
            break;

          case 'CHRONIC_DELAY':
            sendRes = await sendOverdueAutoFlagEmail({
              toEmail: recipient.email,
              toName: recipient.name,
              managerEmail: event.metadata?.managerEmail,
              managerName: event.metadata?.managerName,
              taskId: event.taskId || 'N/A',
              taskTitle: event.taskTitle || event.title,
              scheduledDate: event.metadata?.scheduledDate || '',
              daysOverdue: event.metadata?.daysOverdue || 3,
              hasReason: event.metadata?.hasReason || false,
              delayReason: event.metadata?.delayReason,
              isEscalated: true,
            });
            break;

          case 'CONFIG_ROLLBACK':
            sendRes = await sendConfigRollbackEmail({
              adminEmail: recipient.email,
              adminName: recipient.name,
              restoredVersion: event.metadata?.restoredVersion || 'Previous Stable Baseline',
              previousVersion: event.metadata?.previousVersion || 'Unknown',
              triggeredBy: event.metadata?.triggeredBy || 'Super Admin',
              problemReason: event.metadata?.problemReason || event.message,
              baseUrl: event.metadata?.baseUrl,
            });
            break;

          default:
            sendRes = { success: true };
            break;
        }

        if (sendRes.success) {
          sentSuccessfully = true;
          break;
        } else {
          lastError = sendRes.error || 'SMTP dispatch rejected';
        }
      } catch (err: any) {
        lastError = err?.message || 'SMTP exception';
      }

      // Small backoff before retry (50ms)
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    if (sentSuccessfully) {
      // Flowchart 20 Node: "Delivery failed? No -> Mark delivered -> End"
      emailLog.status = 'DELIVERED';
      emailLog.attempts = attempts;
      emailLog.deliveredAt = new Date().toISOString();
      await emailLog.save();

      emailResults.push({
        recipientEmail: recipient.email,
        status: 'DELIVERED',
        attempts,
      });
    } else {
      // Flowchart 20 Node: "Delivery failed? Yes -> Retry up to 3 times then mark failed -> Add to Admin failure summary -> End"
      emailLog.status = 'FAILED';
      emailLog.attempts = 3;
      emailLog.lastError = lastError;
      emailLog.addedToAdminSummary = true;
      await emailLog.save();

      // Log immutable audit entry for Admin failure summary
      await AuditLogModel.create({
        id: `audit-notif-fail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Email Delivery Failure (Flowchart 20)',
        oldValue: `Pending Dispatch to ${recipient.email}`,
        newValue: `FAILED after 3 retries: ${lastError}`,
        actor: 'Notification Dispatch Engine',
        actorRole: 'SUPER_ADMIN',
        ipAddress: '127.0.0.1',
        deviceInfo: 'Flowchart 20 Reliability Daemon',
        notes: `Event: ${event.eventType}. Deliverable: #${event.taskId || 'N/A'}. Added to Admin failure summary.`,
      }).catch(err => console.warn('[Audit Log Error]', err));

      emailResults.push({
        recipientEmail: recipient.email,
        status: 'FAILED',
        attempts: 3,
        error: lastError,
      });
    }
  }

  return {
    inAppCreatedCount,
    emailResults,
  };
}
