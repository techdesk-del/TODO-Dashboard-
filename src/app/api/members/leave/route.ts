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

    // Resolve reporting manager name and email (checking managerId, managerEmail, manager name, and roster fallback)
    let resolvedManagerName = (member.manager || '').trim();
    let resolvedManagerEmail = (member.managerEmail || '').toLowerCase().trim();

    if (member.managerId) {
      const mgrById = allMembers.find(
        m => m.id === member.managerId || m.employeeId === member.managerId
      );
      if (mgrById) {
        if (!resolvedManagerName) resolvedManagerName = mgrById.name;
        if (!resolvedManagerEmail && mgrById.email) resolvedManagerEmail = mgrById.email.toLowerCase().trim();
      }
    }

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
      const cleanTargetMgr = resolvedManagerName.replace(/\s*\(.*\)$/, '').toLowerCase().trim();
      const mgrRecord = allMembers.find(
        m => m.name.toLowerCase().trim() === cleanTargetMgr || m.name.toLowerCase().includes(cleanTargetMgr)
      );
      if (mgrRecord?.email) {
        resolvedManagerEmail = mgrRecord.email.toLowerCase().trim();
      } else {
        const rosterMgr = OFFICIAL_ROSTER.find(
          r => r.name.toLowerCase().trim() === cleanTargetMgr || r.name.toLowerCase().includes(cleanTargetMgr)
        );
        if (rosterMgr?.email) resolvedManagerEmail = rosterMgr.email.toLowerCase().trim();
      }
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
    ).catch(() => { });

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


    // Node 6: Strict Governance Recipient List -> ONLY Reporting Manager + Founder & CEO + Admin Users
    const recipientsMap = new Map<string, { email: string; name: string }>();
    const onLeaveEmpEmail = (member.email || '').toLowerCase().trim();

    // 1. Employee's Reporting Manager
    if (resolvedManagerEmail && resolvedManagerEmail.includes('@')) {
      recipientsMap.set(resolvedManagerEmail, {
        email: resolvedManagerEmail,
        name: resolvedManagerName.replace(/\s*\(.*\)$/, '').trim() || emailToNameMap.get(resolvedManagerEmail) || 'Reporting Manager',
      });
    }

    // 2. Founder & CEO (Mr. Sukh Sagar Singh - ceo@urbangaon.com)
    const ceoEmail = 'ceo@urbangaon.com';
    recipientsMap.set(ceoEmail, {
      email: ceoEmail,
      name: emailToNameMap.get(ceoEmail) || 'Mr. Sukh Sagar Singh (Founder & CEO)',
    });

    // 3. All Active ADMIN and SUPER_ADMIN Users from Database & Official Roster
    allMembers.forEach(m => {
      const mEmail = (m.email || '').toLowerCase().trim();
      if (!mEmail || !mEmail.includes('@') || m.status === 'DEACTIVATED') return;
      const isAdminOrCeo =
        m.role === 'ADMIN' ||
        m.role === 'SUPER_ADMIN' ||
        mEmail === 'ceo@urbangaon.com' ||
        (m.designation || '').toLowerCase().includes('ceo');
      if (isAdminOrCeo && !recipientsMap.has(mEmail)) {
        recipientsMap.set(mEmail, {
          email: mEmail,
          name: m.name || emailToNameMap.get(mEmail) || 'Admin Operations',
        });
      }
    });

    OFFICIAL_ROSTER.forEach(r => {
      const rEmail = (r.email || '').toLowerCase().trim();
      if (!rEmail || !rEmail.includes('@') || (r as any).status === 'DEACTIVATED') return;
      if ((r.role === 'ADMIN' || r.role === 'SUPER_ADMIN') && !recipientsMap.has(rEmail)) {
        recipientsMap.set(rEmail, {
          email: rEmail,
          name: r.name,
        });
      }
    });

    // Exclude the employee going on leave themselves (unless they are the CEO) so strictly Reporting Manager, CEO & Admins receive the alert
    if (onLeaveEmpEmail && onLeaveEmpEmail !== 'ceo@urbangaon.com') {
      recipientsMap.delete(onLeaveEmpEmail);
    }

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
    ).catch(() => { });

    const activeTasksCount = await TaskModel.countDocuments({
      status: { $nin: ['Done', 'Cancelled'] },
      $or: [
        { 'assignees.id': member.id },
        { 'assignees.email': member.email.toLowerCase().trim() },
        { 'assignees.name': member.name },
      ],
    });

    // Strict Governance Recipient List on Return from Leave -> Reporting Manager + Founder & CEO + Admin Users
    const allMembersForReturn = await MemberModel.find({}).lean().exec();
    const returnMap = new Map<string, { email: string; name: string }>();
    const returningEmpEmail = (member.email || '').toLowerCase().trim();

    let retMgrEmail = (member.managerEmail || '').toLowerCase().trim();
    let retMgrName = (member.manager || '').trim();
    if (member.managerId) {
      const mgrDoc = allMembersForReturn.find(m => m.id === member.managerId || m.employeeId === member.managerId);
      if (mgrDoc) {
        if (!retMgrEmail && mgrDoc.email) retMgrEmail = mgrDoc.email.toLowerCase().trim();
        if (!retMgrName && mgrDoc.name) retMgrName = mgrDoc.name;
      }
    }
    if (!retMgrEmail && retMgrName) {
      const cleanMgr = retMgrName.replace(/\s*\(.*\)$/, '').toLowerCase().trim();
      const mgrDoc = allMembersForReturn.find(m => m.name.toLowerCase().trim() === cleanMgr || m.name.toLowerCase().includes(cleanMgr));
      if (mgrDoc?.email) retMgrEmail = mgrDoc.email.toLowerCase().trim();
    }
    if (retMgrEmail && retMgrEmail.includes('@')) {
      returnMap.set(retMgrEmail, {
        email: retMgrEmail,
        name: retMgrName.replace(/\s*\(.*\)$/, '').trim() || 'Reporting Manager',
      });
    }

    returnMap.set('ceo@urbangaon.com', {
      email: 'ceo@urbangaon.com',
      name: 'Mr. Sukh Sagar Singh (Founder & CEO)',
    });

    allMembersForReturn.forEach(m => {
      const mEmail = (m.email || '').toLowerCase().trim();
      if (!mEmail || !mEmail.includes('@') || m.status === 'DEACTIVATED') return;
      if ((m.role === 'ADMIN' || m.role === 'SUPER_ADMIN') && !returnMap.has(mEmail)) {
        returnMap.set(mEmail, { email: mEmail, name: m.name });
      }
    });

    OFFICIAL_ROSTER.forEach(r => {
      const rEmail = (r.email || '').toLowerCase().trim();
      if (!rEmail || !rEmail.includes('@') || (r as any).status === 'DEACTIVATED') return;
      if ((r.role === 'ADMIN' || r.role === 'SUPER_ADMIN') && !returnMap.has(rEmail)) {
        returnMap.set(rEmail, { email: rEmail, name: r.name });
      }
    });

    if (returningEmpEmail && returningEmpEmail !== 'ceo@urbangaon.com') {
      returnMap.delete(returningEmpEmail);
    }

    const returnRecipients = Array.from(returnMap.values());

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
