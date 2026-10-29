/**
 * app/api/members/leave/route.ts
 *
 * Implements Flowchart 23: Leave and Holiday Handling Flow (Phase 5)
 *
 * Operational Nodes:
 * 1. Admin marks employee on leave with start and end date
 * 2. System flags employee as On Leave (MemberModel + UserModel + Real-Time Broadcast)
 * 3. Pause reminders for that employee (reminders query excludes non-ACTIVE)
 * 4. Show on-leave badge on their tasks
 * 5. Task due during leave?
 *    - Yes -> Auto-extend due date (both scheduledDate & dueDate) or flag for Admin decision
 *    - No  -> No change (still listed in active tasks summary)
 * 6. Notify employee on leave, reporting manager, and task creators with full details
 * 7. On return date restore reminders and status
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { TaskModel } from '@/models/Task';
import { AuditLogModel } from '@/models/AuditLog';
import { dispatchNotificationFlow } from '@/lib/notificationDispatcher';
import { broadcastMemberMutation, broadcastTaskMutation } from '@/lib/events';
import { OFFICIAL_ROSTER } from '@/lib/rosterData';
import type { AffectedLeaveTaskItem, OtherActiveLeaveTaskItem } from '@/lib/email';

function calculateInclusiveLeaveDays(startStr: string, endStr: string): number {
  try {
    const s = new Date(startStr + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

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

    const member = await MemberModel.findOne({
      $or: [
        { id: memberId },
        { employeeId: memberId },
        { email: String(memberId).toLowerCase().trim() },
      ],
    });
    if (!member) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const previousStatus = member.status;
    const nowIso = new Date().toISOString();

    // Lookup all members to resolve real names and reporting manager details accurately
    const allMembers = await MemberModel.find({}).lean().exec();
    const emailToNameMap = new Map<string, string>();
    allMembers.forEach(m => {
      if (m.email) emailToNameMap.set(m.email.toLowerCase().trim(), m.name);
    });
    OFFICIAL_ROSTER.forEach(r => {
      const clean = r.email.toLowerCase().trim();
      if (!emailToNameMap.has(clean)) emailToNameMap.set(clean, r.name);
      (r.aliases || []).forEach(a => {
        if (!emailToNameMap.has(a.toLowerCase().trim())) emailToNameMap.set(a.toLowerCase().trim(), r.name);
      });
    });

    // Resolve reporting manager name and email
    let resolvedManagerName = member.manager || '';
    let resolvedManagerEmail = (member.managerEmail || '').toLowerCase().trim();

    if (!resolvedManagerEmail || !resolvedManagerName) {
      const rosterMatch = OFFICIAL_ROSTER.find(
        r => r.id === member.id || r.email.toLowerCase() === member.email.toLowerCase()
      );
      if (rosterMatch) {
        if (!resolvedManagerName && (rosterMatch as any).manager) resolvedManagerName = (rosterMatch as any).manager;
        if (!resolvedManagerEmail && (rosterMatch as any).managerEmail) resolvedManagerEmail = (rosterMatch as any).managerEmail.toLowerCase().trim();
      }
    }
    if (!resolvedManagerEmail && resolvedManagerName) {
      const mgrRecord = allMembers.find(m => m.name.toLowerCase().trim() === resolvedManagerName.toLowerCase().trim());
      if (mgrRecord?.email) resolvedManagerEmail = mgrRecord.email.toLowerCase().trim();
    }
    if (resolvedManagerEmail && !resolvedManagerName) {
      resolvedManagerName = emailToNameMap.get(resolvedManagerEmail) || 'Reporting Manager';
    }
    if (!resolvedManagerName) {
      resolvedManagerName = 'Dr. Rekha Pareek (Operations Head)';
      if (!resolvedManagerEmail) resolvedManagerEmail = 'rekha.pareek@urbangaon.com';
    }

    // Node 2: System flags employee as On Leave in both MemberModel and UserModel
    member.status = 'ON_LEAVE';
    member.leaveStartDate = leaveStartDate;
    member.leaveEndDate = leaveEndDate;
    member.leaveAction = taskDueAction;
    member.leaveNotes = notes || 'Authorized staff leave';
    member.updatedAt = nowIso;
    await member.save();

    await UserModel.updateMany(
      { $or: [{ id: member.id }, { email: member.email.toLowerCase().trim() }] },
      {
        $set: {
          status: 'ON_LEAVE',
          leaveStartDate,
          leaveEndDate,
          updatedAt: nowIso,
        },
      }
    ).catch(() => {});

    // Node 5: Evaluate tasks assigned to this employee
    const activeTasks = await TaskModel.find({
      status: { $nin: ['Done', 'Cancelled'] },
      $or: [
        { 'assignees.id': member.id },
        { 'assignees.email': member.email.toLowerCase().trim() },
        { 'assignees.name': member.name },
      ],
    });

    const affectedTasks: AffectedLeaveTaskItem[] = [];
    const otherActiveTasks: OtherActiveLeaveTaskItem[] = [];
    const creatorRecipients = new Map<string, string>(); // email -> real name

    for (const t of activeTasks) {
      const effectiveDue = t.dueDate || t.scheduledDate;
      const isDueDuringLeave =
        (t.scheduledDate >= leaveStartDate && t.scheduledDate <= leaveEndDate) ||
        (effectiveDue >= leaveStartDate && effectiveDue <= leaveEndDate);

      const creatorEmailClean = (t.creator?.email || '').toLowerCase().trim();
      const creatorRealName =
        (t.creator?.name && t.creator.name !== 'Deliverable Creator' ? t.creator.name : '') ||
        (creatorEmailClean ? emailToNameMap.get(creatorEmailClean) : '') ||
        'Management';

      if (creatorEmailClean && creatorEmailClean.includes('@')) {
        creatorRecipients.set(creatorEmailClean, creatorRealName);
      }

      if (isDueDuringLeave) {
        const originalDueDate = effectiveDue || t.scheduledDate;
        let actionApplied = 'No change';

        if (taskDueAction === 'AUTO_EXTEND') {
          t.scheduledDate = leaveEndDate;
          t.dueDate = leaveEndDate;
          const syncTag = `[Leave Sync: Due date auto-extended from ${originalDueDate} to ${leaveEndDate} due to ${member.name}'s leave (${leaveStartDate} to ${leaveEndDate})]`;
          if (!t.notes || !t.notes.includes(syncTag)) {
            t.notes = t.notes ? `${t.notes} | ${syncTag}` : syncTag;
          }
          t.updatedAt = nowIso;
          actionApplied = `Auto-extended from ${originalDueDate} to ${leaveEndDate}`;
          await t.save();
        } else if (taskDueAction === 'FLAG_ADMIN') {
          const flagTag = `[Leave Sync: Due during ${member.name}'s leave (${leaveStartDate} to ${leaveEndDate}) — Flagged for Admin/Manager decision]`;
          if (!t.notes || !t.notes.includes(flagTag)) {
            t.notes = t.notes ? `${t.notes} | ${flagTag}` : flagTag;
          }
          t.updatedAt = nowIso;
          actionApplied = 'Flagged for Admin / Manager review';
          await t.save();
        }

        affectedTasks.push({
          id: t.id,
          title: t.title,
          originalDueDate,
          scheduledDate: t.scheduledDate,
          time: t.time || '05:00 PM',
          priority: t.priority || 'NORMAL',
          status: t.status || 'Not Started',
          department: t.department || member.department || 'Operations',
          creatorName: creatorRealName,
          actionApplied,
        });
      } else {
        otherActiveTasks.push({
          id: t.id,
          title: t.title,
          scheduledDate: t.dueDate || t.scheduledDate,
          time: t.time || '05:00 PM',
          priority: t.priority || 'NORMAL',
          status: t.status || 'Not Started',
          department: t.department || member.department || 'Operations',
          creatorName: creatorRealName,
        });
      }
    }

    // Node 6: Synchronize recipient list (Employee on Leave + Reporting Manager + Task Creators) with REAL names
    const recipientsMap = new Map<string, { email: string; name: string }>();

    // 1. Always notify the employee placed on leave with their real name
    if (member.email && member.email.includes('@')) {
      const empEmail = member.email.toLowerCase().trim();
      recipientsMap.set(empEmail, {
        email: empEmail,
        name: member.name,
      });
    }

    // 2. Notify Reporting Manager
    if (resolvedManagerEmail && resolvedManagerEmail.includes('@')) {
      if (!recipientsMap.has(resolvedManagerEmail)) {
        recipientsMap.set(resolvedManagerEmail, {
          email: resolvedManagerEmail,
          name: resolvedManagerName.replace(/\s*\(.*\)$/, '').trim() || 'Reporting Manager',
        });
      }
    }

    // 3. Notify Creators of active/affected tasks using their real names
    creatorRecipients.forEach((cName, cEmail) => {
      if (!recipientsMap.has(cEmail)) {
        recipientsMap.set(cEmail, {
          email: cEmail,
          name: cName,
        });
      }
    });

    const recipientsToNotify = Array.from(recipientsMap.values());
    const leaveDaysCount = calculateInclusiveLeaveDays(leaveStartDate, leaveEndDate);

    if (recipientsToNotify.length > 0) {
      await dispatchNotificationFlow({
        eventType: 'STAFF_LEAVE_ALERT',
        recipients: recipientsToNotify,
        title: `Staff Leave Notice: ${member.name} (${leaveStartDate} to ${leaveEndDate})`,
        message: `${member.name} (${member.designation}, ${member.department}) is On Leave from ${leaveStartDate} to ${leaveEndDate} (${leaveDaysCount} day${leaveDaysCount === 1 ? '' : 's'}). Automated reminders paused. ${affectedTasks.length} of ${activeTasks.length} active deliverable(s) fall within this leave window (${taskDueAction === 'AUTO_EXTEND' ? `Auto-extended to ${leaveEndDate}` : 'Flagged for review'}).`,
        metadata: {
          employeeName: member.name,
          employeeEmail: member.email,
          employeeId: member.employeeId || member.id,
          department: member.department || 'Operations',
          designation: member.designation || 'Specialist',
          managerName: resolvedManagerName,
          leaveStartDate,
          leaveEndDate,
          leaveDaysCount,
          taskDueAction,
          notes: notes || 'Authorized staff leave',
          authorizedBy: actorName,
          authorizedRole: actorRole,
          totalActiveTasksCount: activeTasks.length,
          affectedTasks,
          otherActiveTasks,
        },
      }).catch(err => console.warn('[Leave Notification Dispatch Error]', err));
    }

    // Real-time SSE Broadcast so all open portals (CEO, Manager, Admin, Employee) sync immediately
    broadcastMemberMutation({
      action: 'UPDATED',
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      status: 'ON_LEAVE',
      member: member.toObject(),
    });

    if (affectedTasks.length > 0) {
      broadcastTaskMutation({
        action: 'UPDATED',
        taskId: 'leave-sync',
        taskTitle: `Leave schedule synced for ${member.name} (${affectedTasks.length} deliverables updated)`,
      });
    }

    // Audit Log Entry
    await AuditLogModel.create({
      id: `audit-leave-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Staff Leave Protocol',
      oldValue: `${member.name} [${previousStatus}]`,
      newValue: `${member.name} [ON_LEAVE: ${leaveStartDate} to ${leaveEndDate}]`,
      actor: actorName,
      actorRole: actorRole as any,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: 'UrbanGaon HR Leave Engine',
      notes: `Leave duration: ${leaveStartDate} to ${leaveEndDate} (${leaveDaysCount} days). Policy: ${taskDueAction}. Total active deliverables: ${activeTasks.length}. Impacted deliverables: ${affectedTasks.length}. Reminders paused. Dispatched leave notifications to: ${recipientsToNotify.map(r => `${r.name} <${r.email}>`).join(', ')}.`,
    });

    return NextResponse.json({
      success: true,
      member: member.toObject(),
      affectedTasks,
      otherActiveTasks,
      notifiedRecipients: recipientsToNotify,
      message: `Employee ${member.name} marked On Leave (${leaveStartDate} to ${leaveEndDate}). Reminders paused, ${affectedTasks.length} deliverable(s) synchronized, and notifications dispatched.`,
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

    const member = await MemberModel.findOne({
      $or: [
        { id: memberId },
        { employeeId: memberId },
        { email: String(memberId).toLowerCase().trim() },
      ],
    });
    if (!member) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const previousStatus = member.status;
    const leaveStart = member.leaveStartDate || 'N/A';
    const leaveEnd = member.leaveEndDate || 'N/A';
    const nowIso = new Date().toISOString();

    member.status = 'ACTIVE';
    member.leaveStartDate = undefined;
    member.leaveEndDate = undefined;
    member.leaveAction = undefined;
    member.leaveNotes = undefined;
    member.updatedAt = nowIso;
    await member.save();

    await UserModel.updateMany(
      { $or: [{ id: member.id }, { email: member.email.toLowerCase().trim() }] },
      {
        $set: { status: 'ACTIVE', updatedAt: nowIso },
        $unset: { leaveStartDate: '', leaveEndDate: '' },
      }
    ).catch(() => {});

    const activeTasksCount = await TaskModel.countDocuments({
      status: { $nin: ['Done', 'Cancelled'] },
      $or: [
        { 'assignees.id': member.id },
        { 'assignees.email': member.email.toLowerCase().trim() },
        { 'assignees.name': member.name },
      ],
    });

    const returnRecipients: Array<{ email: string; name: string }> = [];
    if (member.email && member.email.includes('@')) {
      returnRecipients.push({ email: member.email.toLowerCase().trim(), name: member.name });
    }
    if (member.managerEmail && member.managerEmail.includes('@') && member.managerEmail.toLowerCase().trim() !== member.email.toLowerCase().trim()) {
      returnRecipients.push({
        email: member.managerEmail.toLowerCase().trim(),
        name: member.manager || 'Reporting Manager',
      });
    }

    if (returnRecipients.length > 0) {
      await dispatchNotificationFlow({
        eventType: 'STAFF_RETURN_FROM_LEAVE',
        recipients: returnRecipients,
        title: `Return from Leave: ${member.name} Restored to ACTIVE`,
        message: `${member.name} (${member.designation}, ${member.department}) has returned from leave (${leaveStart} to ${leaveEnd}). Profile status is restored to ACTIVE and automated reminders are resumed.`,
        metadata: {
          employeeName: member.name,
          employeeEmail: member.email,
          employeeId: member.employeeId || member.id,
          department: member.department || 'Operations',
          designation: member.designation || 'Specialist',
          leaveStartDate: leaveStart,
          leaveEndDate: leaveEnd,
          restoredBy: actorName,
          activeTasksCount,
        },
      }).catch(err => console.warn('[Return Notification Dispatch Error]', err));
    }

    broadcastMemberMutation({
      action: 'UPDATED',
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      status: 'ACTIVE',
      member: member.toObject(),
    });

    // Audit Log Entry
    await AuditLogModel.create({
      id: `audit-return-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Staff Return from Leave',
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
      message: `Employee ${member.name} returned from leave. Status restored to ACTIVE and reminders unpaused.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members/leave PATCH error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
