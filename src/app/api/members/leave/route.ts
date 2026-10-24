/**
 * app/api/members/leave/route.ts
 *
 * Implements Flowchart 23: Leave and Holiday Handling Flow (Phase 5)
 *
 * Operational Nodes:
 * 1. Admin marks employee on leave with start and end date
 * 2. System flags employee as On Leave
 * 3. Pause reminders for that employee (reminders query excludes non-ACTIVE)
 * 4. Show on-leave badge on their tasks
 * 5. Task due during leave?
 *    - Yes -> Auto-extend due date or flag for Admin decision
 *    - No  -> No change
 * 6. Notify creator and reporting manager
 * 7. On return date restore reminders and status
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { TaskModel } from '@/models/Task';
import { AuditLogModel } from '@/models/AuditLog';
import { dispatchNotificationFlow } from '@/lib/notificationDispatcher';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      memberId,
      leaveStartDate,
      leaveEndDate,
      taskDueAction = 'AUTO_EXTEND', // 'AUTO_EXTEND' | 'FLAG_ADMIN'
      notes,
      actorName = 'Admin HR',
      actorRole = 'ADMIN',
    } = body;

    if (!memberId || !leaveStartDate || !leaveEndDate) {
      return NextResponse.json(
        { success: false, error: 'memberId, leaveStartDate, and leaveEndDate are required.' },
        { status: 400 }
      );
    }

    const member = await MemberModel.findOne({ id: memberId });
    if (!member) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const previousStatus = member.status;

    // Node 2: System flags employee as On Leave
    member.status = 'ON_LEAVE';
    (member as any).leaveStartDate = leaveStartDate;
    (member as any).leaveEndDate = leaveEndDate;
    (member as any).leaveAction = taskDueAction;
    (member as any).leaveNotes = notes || '';
    member.updatedAt = new Date().toISOString();
    await member.save();

    // Node 5: Evaluate tasks due during leave
    const activeTasks = await TaskModel.find({
      status: { $nin: ['Done', 'Cancelled'] },
      $or: [
        { 'assignees.id': member.id },
        { 'assignees.email': member.email.toLowerCase() },
      ],
    });

    const affectedTasks: Array<{ id: string; title: string; scheduledDate: string; actionApplied: string }> = [];
    const creatorEmails = new Set<string>();

    for (const t of activeTasks) {
      const isDueDuringLeave = t.scheduledDate >= leaveStartDate && t.scheduledDate <= leaveEndDate;
      if (isDueDuringLeave) {
        let actionApplied = 'No change';
        if (taskDueAction === 'AUTO_EXTEND') {
          const oldDue = t.scheduledDate;
          t.scheduledDate = leaveEndDate;
          t.notes = t.notes
            ? `${t.notes} | [FC 23: Auto-extended from ${oldDue} to ${leaveEndDate} due to employee leave]`
            : `[FC 23: Auto-extended from ${oldDue} to ${leaveEndDate} due to employee leave]`;
          actionApplied = `Auto-extended to ${leaveEndDate}`;
          await t.save();
        } else if (taskDueAction === 'FLAG_ADMIN') {
          t.notes = t.notes
            ? `${t.notes} | [FC 23: Due during staff leave (${leaveStartDate} to ${leaveEndDate}) - Flagged for Admin decision]`
            : `[FC 23: Due during staff leave (${leaveStartDate} to ${leaveEndDate}) - Flagged for Admin decision]`;
          actionApplied = 'Flagged for Admin decision';
          await t.save();
        }

        affectedTasks.push({
          id: t.id,
          title: t.title,
          scheduledDate: t.scheduledDate,
          actionApplied,
        });

        if (t.creator?.email && t.creator.email.includes('@')) {
          creatorEmails.add(t.creator.email.toLowerCase());
        }
      }
    }

    // Node 6: Notify creator and reporting manager
    const recipientsToNotify: Array<{ email: string; name: string }> = [];
    if (member.managerEmail && member.managerEmail.includes('@')) {
      recipientsToNotify.push({
        email: member.managerEmail.toLowerCase(),
        name: member.manager || 'Reporting Manager',
      });
    }

    creatorEmails.forEach(cEmail => {
      if (!recipientsToNotify.some(r => r.email === cEmail)) {
        recipientsToNotify.push({
          email: cEmail,
          name: 'Deliverable Creator',
        });
      }
    });

    if (recipientsToNotify.length > 0) {
      await dispatchNotificationFlow({
        eventType: 'TASK_ASSIGNED',
        recipients: recipientsToNotify,
        title: `Staff Leave Alert: ${member.name} (${leaveStartDate} to ${leaveEndDate})`,
        message: `${member.name} has been marked On Leave from ${leaveStartDate} to ${leaveEndDate}. Reminders paused. ${affectedTasks.length} task(s) fall within this leave window (Action: ${taskDueAction === 'AUTO_EXTEND' ? 'Auto-extended' : 'Flagged for review'}).`,
        metadata: {
          leaveStartDate,
          leaveEndDate,
          taskDueAction,
          affectedTasksCount: affectedTasks.length,
          notes: notes || 'Authorized leave',
        },
      }).catch(err => console.warn('[Flowchart 23 Leave Notification Dispatch Error]', err));
    }

    // Audit Log Entry
    await AuditLogModel.create({
      id: `audit-leave-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Staff Leave Protocol (Flowchart 23)',
      oldValue: `${member.name} [${previousStatus}]`,
      newValue: `${member.name} [ON_LEAVE: ${leaveStartDate} to ${leaveEndDate}]`,
      actor: actorName,
      actorRole: actorRole as any,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: 'UrbanGaon HR Leave Engine',
      notes: `Leave duration: ${leaveStartDate} to ${leaveEndDate}. Policy: ${taskDueAction}. Affected deliverables: ${affectedTasks.length}. Reminders automatically paused. Creators & managers notified.`,
    });

    return NextResponse.json({
      success: true,
      member: member.toObject(),
      affectedTasks,
      message: `Employee ${member.name} flagged as On Leave (${leaveStartDate} to ${leaveEndDate}). Reminders paused. ${affectedTasks.length} tasks processed.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members/leave POST error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Node 7: On return date restore reminders and status
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { memberId, actorName = 'Admin HR' } = body;

    if (!memberId) {
      return NextResponse.json({ success: false, error: 'memberId is required.' }, { status: 400 });
    }

    const member = await MemberModel.findOne({ id: memberId });
    if (!member) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const previousStatus = member.status;
    const leaveStart = (member as any).leaveStartDate || 'N/A';
    const leaveEnd = (member as any).leaveEndDate || 'N/A';

    member.status = 'ACTIVE';
    (member as any).leaveStartDate = undefined;
    (member as any).leaveEndDate = undefined;
    (member as any).leaveAction = undefined;
    (member as any).leaveNotes = undefined;
    member.updatedAt = new Date().toISOString();
    await member.save();

    // Audit Log Entry
    await AuditLogModel.create({
      id: `audit-return-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Staff Return from Leave (Flowchart 23)',
      oldValue: `${member.name} [${previousStatus} (${leaveStart} to ${leaveEnd})]`,
      newValue: `${member.name} [ACTIVE]`,
      actor: actorName,
      actorRole: 'ADMIN',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: 'UrbanGaon HR Leave Engine',
      notes: `Staff return date reached / manual restoration. Status restored to ACTIVE. Automated reminders and overdue evaluations unpaused.`,
    });

    return NextResponse.json({
      success: true,
      member: member.toObject(),
      message: `Employee ${member.name} returned from leave. Status restored to ACTIVE. Reminders unpaused.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members/leave PATCH error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
