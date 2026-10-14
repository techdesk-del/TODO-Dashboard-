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
import { isCeoUser } from '@/lib/rosterData';
import type { TaskStatus, AssigneeInfo } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      departingMemberId,
      successorMemberId,
      reason = 'Resignation / Voluntary Transition',
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
            remarks: `Handover from ${departingMember.name} (FC 18: ${reason})`,
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

    // 2. Mark departing member as DEACTIVATED in MemberModel
    departingMember.status = 'DEACTIVATED';
    departingMember.totalTasks = Math.max(0, (departingMember.totalTasks || 0) - reassignedCount);
    departingMember.activeTasks = 0;
    await departingMember.save();

    // 3. Update successor's task count in MemberModel
    successorMember.totalTasks = (successorMember.totalTasks || 0) + reassignedCount;
    successorMember.activeTasks = (successorMember.activeTasks || 0) + reassignedCount;
    await successorMember.save();

    // 4. Update UserModel to suspend login
    await UserModel.updateMany(
      { $or: [{ id: departingMember.id }, { email: departingMember.email.toLowerCase() }] },
      { $set: { isDeactivated: true, status: 'DEACTIVATED' } }
    );

    // 5. Create immutable audit log entry
    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Account Status & Deliverable Reallocation',
      oldValue: `${departingMember.name} [ACTIVE] (${reassignedCount} tasks)`,
      newValue: `${departingMember.name} [DEACTIVATED] → All ${reassignedCount} tasks reassigned to ${successorMember.name}`,
      actor,
      actorRole: actorRole as any,
      ipAddress: '127.0.0.1 (Internal Governance)',
      deviceInfo: 'UrbanGaon Executive Command Center',
      notes: `Flowchart 18 Offboarding Protocol: ${reason}`
    });

    return NextResponse.json({
      success: true,
      reassignedCount,
      departingMember: departingMember.toObject ? departingMember.toObject() : departingMember,
      successorMember: successorMember.toObject ? successorMember.toObject() : successorMember,
      message: `Account for ${departingMember.name} successfully deactivated. ${reassignedCount} active deliverable(s) handed over to ${successorMember.name}.`
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown deactivation error';
    console.error('[API/members/deactivate]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
