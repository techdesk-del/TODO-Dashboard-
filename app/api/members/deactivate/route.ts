/**
 * app/api/members/deactivate/route.ts
 * POST /api/members/deactivate — Account Deactivation & Mandatory Task Handover (Flowchart 18)
 *
 * Reallocates all active deliverables of the departing staff member to a designated successor,
 * marks departing employee status as DEACTIVATED in MongoDB Atlas (MemberModel & UserModel),
 * and generates an immutable audit trail entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { TaskModel } from '@/models/Task';
import { AuditLogModel } from '@/models/AuditLog';
import { isCeoUser } from '@/shared/lib/rosterData';
import { sendOffboardingSummaryEmail, sendHandoverNotificationToManagerEmail } from '@/lib/email';
import { broadcastMemberMutation, broadcastTaskMutation } from '@/lib/events';
import type { TaskStatus, AssigneeInfo } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      departingMemberId,
      successorMemberId,
      reason = 'Resignation / Voluntary Transition',
      deactivationType = 'Resignation',
      lastWorkingDay,
      effectiveDate,
      leaveStartDate,
      leaveEndDate,
      actor = 'Super Admin',
      actorRole = 'SUPER_ADMIN'
    } = body;

    if (!departingMemberId || !successorMemberId) {
      return NextResponse.json(
        { success: false, error: 'Both departing employee and successor recipient are required.' },
        { status: 400 }
      );
    }

    if (departingMemberId === successorMemberId) {
      return NextResponse.json(
        { success: false, error: 'Successor cannot be the same departing employee.' },
        { status: 400 }
      );
    }

    // Lookup departing employee
    const departingMember = await MemberModel.findOne({
      $or: [{ id: departingMemberId }, { name: departingMemberId }, { email: departingMemberId.toLowerCase() }]
    });

    if (!departingMember) {
      return NextResponse.json(
        { success: false, error: 'Departing employee record not found.' },
        { status: 404 }
      );
    }

    // Security Guard: CEO cannot be deactivated
    if (isCeoUser(departingMember)) {
      return NextResponse.json(
        { success: false, error: 'Executive Command Protection: CEO account cannot be deactivated.' },
        { status: 403 }
      );
    }

    // Lookup successor
    const successorMember = await MemberModel.findOne({
      $or: [{ id: successorMemberId }, { name: successorMemberId }, { email: successorMemberId.toLowerCase() }]
    });

    if (!successorMember) {
      return NextResponse.json(
        { success: false, error: 'Handover successor employee record not found.' },
        { status: 404 }
      );
    }

    if (successorMember.status === 'DEACTIVATED') {
      return NextResponse.json(
        { success: false, error: 'Cannot handover tasks to an already deactivated employee.' },
        { status: 400 }
      );
    }

    // 1. Reassign all active tasks in MongoDB Atlas
    const activeStatuses: TaskStatus[] = ['In Progress', 'Queued', 'On Hold', 'Escalated', 'Review'];
    
    // Find all tasks where departing member is in assignees
    const tasksToReassign = await TaskModel.find({
      status: { $in: activeStatuses },
      $or: [
        { 'assignees.id': departingMember.id },
        { 'assignees.name': departingMember.name },
        { 'assignees.email': departingMember.email.toLowerCase() }
      ]
    });

    let reassignedCount = 0;
    const nowIso = new Date().toISOString();

    for (const task of (tasksToReassign as any[])) {
      let modified = false;
      const updatedAssignees = (task.assignees || []).map((a: AssigneeInfo) => {
        const isMatch = a.id === departingMember.id ||
          a.name.toLowerCase() === departingMember.name.toLowerCase() ||
          a.email.toLowerCase() === departingMember.email.toLowerCase();

        if (isMatch) {
          modified = true;
          return {
            id: successorMember.id,
            name: successorMember.name,
            email: successorMember.email.toLowerCase(),
            department: successorMember.department,
            designation: successorMember.designation,
            avatar: successorMember.avatar,
            status: a.status || 'In Progress',
            remarks: `Handover from ${departingMember.name}: ${reason}`,
            completedAt: a.completedAt
          };
        }
        return a;
      });

      if (modified) {
        task.assignees = updatedAssignees;
        task.updatedAt = nowIso;
        await task.save();
        reassignedCount++;
      }
    }

    const isLongLeave = deactivationType === 'Long leave';
    const newStatus = isLongLeave ? 'ON_LEAVE' : 'DEACTIVATED';

    // 2. Update member status in MemberModel for ALL matching records (id, email, or exact name)
    await MemberModel.updateMany(
      {
        $or: [
          { id: departingMember.id },
          { email: departingMember.email.toLowerCase() },
          { name: departingMember.name }
        ]
      },
      {
        $set: {
          status: newStatus,
          ...(isLongLeave && leaveStartDate ? { leaveStartDate } : {}),
          ...(isLongLeave && leaveEndDate ? { leaveEndDate } : {}),
          ...(isLongLeave && reason ? { leaveNotes: reason } : {}),
          activeTasks: 0,
          totalTasks: Math.max(0, (departingMember.totalTasks || 0) - reassignedCount),
          updatedAt: nowIso
        }
      }
    );

    // 3. Update successor's task count in MemberModel
    successorMember.totalTasks = (successorMember.totalTasks || 0) + reassignedCount;
    successorMember.activeTasks = (successorMember.activeTasks || 0) + reassignedCount;
    successorMember.updatedAt = nowIso;
    await successorMember.save();

    // 4. Update UserModel to suspend login & record dates
    const userUpdates: any = {
      isDeactivated: true,
      status: newStatus,
      deactivationType,
      deactivatedAt: nowIso,
    };
    if (lastWorkingDay) userUpdates.lastWorkingDay = lastWorkingDay;
    if (effectiveDate) userUpdates.effectiveDate = effectiveDate;
    if (leaveStartDate) userUpdates.leaveStartDate = leaveStartDate;
    if (leaveEndDate) userUpdates.leaveEndDate = leaveEndDate;

    await UserModel.updateMany(
      { 
        $or: [
          { id: departingMember.id }, 
          { email: departingMember.email.toLowerCase() },
          { name: departingMember.name }
        ] 
      },
      { $set: userUpdates }
    );

    // 5. Flowchart 4: Send final summary email to departing/on-leave employee
    const dateSummary = isLongLeave
      ? `Leave Duration: ${leaveStartDate || 'Immediate'} to ${leaveEndDate || 'Indefinite'}`
      : deactivationType === 'Termination'
        ? `Effective Termination Date: ${effectiveDate || 'Immediate'}`
        : `Last Working Day: ${lastWorkingDay || 'Immediate'}`;

    if (departingMember.email) {
      sendOffboardingSummaryEmail({
        employeeName: departingMember.name,
        employeeEmail: departingMember.email,
        deactivationType: deactivationType as any,
        dateInfo: dateSummary,
        reassignedCount,
        successorName: successorMember.name,
        reason
      }).catch(e => console.warn('[Offboarding Email Warn]', e));
    }

    // 6. Flowchart 4: Notify Reporting Manager, Founder & CEO, and Admin users of handover / long leave
    const liveRekha = await MemberModel.findOne({ $or: [{ id: 'mem-9' }, { name: /rekha/i }] }).lean().exec();
    const defaultMgrEmail = (liveRekha as any)?.email || 'pareekrekha471@gmail.com';
    const mgrEmail = (departingMember.managerEmail && departingMember.managerEmail !== 'rekha.pareek@urbangaon.com' ? departingMember.managerEmail : defaultMgrEmail).toLowerCase().trim();
    const mgrName = departingMember.manager || 'Dr. Rekha Pareek';
    const governanceRecipients = new Map<string, string>();
    if (mgrEmail && mgrEmail.includes('@')) {
      governanceRecipients.set(mgrEmail, mgrName);
    }
    governanceRecipients.set('ceo@urbangaon.com', 'Mr. Sukh Sagar Singh (Founder & CEO)');
    const adminMembers = await MemberModel.find({
      role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
      status: { $ne: 'DEACTIVATED' },
    }).lean().exec();
    adminMembers.forEach((adm: any) => {
      const admEmail = (adm.email || '').toLowerCase().trim();
      if (admEmail && admEmail.includes('@') && !governanceRecipients.has(admEmail)) {
        governanceRecipients.set(admEmail, adm.name || 'Admin Operations');
      }
    });
    const departingEmailClean = (departingMember.email || '').toLowerCase().trim();
    if (departingEmailClean && departingEmailClean !== 'ceo@urbangaon.com') {
      governanceRecipients.delete(departingEmailClean);
    }
    for (const [recEmail, recName] of governanceRecipients.entries()) {
      sendHandoverNotificationToManagerEmail({
        managerName: recName,
        managerEmail: recEmail,
        departingName: departingMember.name,
        successorName: successorMember.name,
        reassignedCount,
        reason,
        deactivationType: deactivationType as any
      }).catch(e => console.warn('[Manager/Admin/CEO Handover Email Warn]', e));
    }

    // 7. Flowchart 4: Preserve all history & create immutable audit log entry
    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Account Status & Deliverable Handover',
      oldValue: `${departingMember.name} [ACTIVE] (${reassignedCount} tasks)`,
      newValue: `${departingMember.name} [${newStatus}] → All ${reassignedCount} tasks reassigned to ${successorMember.name}`,
      actor,
      actorRole: actorRole as any,
      ipAddress: '127.0.0.1 (Internal Governance)',
      deviceInfo: 'UrbanGaon Executive Command Center',
      notes: `Offboarding Protocol: Type=${deactivationType}. Dates: ${dateSummary}. Notes: ${reason}`
    });

    // Broadcast real-time events to all clients worldwide (<50ms)
    broadcastMemberMutation({
      action: 'DEACTIVATED',
      memberId: departingMember.id,
      memberName: departingMember.name,
      memberEmail: departingMember.email,
      status: newStatus,
    });

    if (reassignedCount > 0) {
      broadcastTaskMutation({
        action: 'UPDATED',
        taskId: 'handover-tasks',
        taskTitle: `${reassignedCount} tasks reassigned to ${successorMember.name}`,
      });
    }

    return NextResponse.json({
      success: true,
      reassignedCount,
      departingMember: departingMember.toObject ? departingMember.toObject() : departingMember,
      successorMember: successorMember.toObject ? successorMember.toObject() : successorMember,
      message: `Account for ${departingMember.name} updated to ${newStatus}. ${reassignedCount} active deliverable(s) handed over to ${successorMember.name}. Notifications dispatched to employee and manager.`
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown deactivation error';
    console.error('[API/members/deactivate]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
