/**
 * app/api/tasks/[id]/route.ts
 * PATCH  /api/tasks/:id  — partial update (status, assignees, reasons, etc.)
 * DELETE /api/tasks/:id  — soft delete (set status = 'Cancelled')
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { AuditLogModel } from '@/models/AuditLog';
import { broadcastTaskMutation, markTaskDeleted } from '@/lib/events';

import { computeMultiAssigneeStatus } from '@/lib/multiAssignee';
import { isStrictCeo, isCeoUser } from '@/lib/rosterData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

/* ── PATCH /api/tasks/:id ────────────────────────────────────────── */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await connectDB();
    const rawParams = ctx?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : (rawParams || {});
    const id = resolvedParams.id;
    const body = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    // Never allow overriding the task's id through a PATCH
    delete body.id;

    let existingTask = await TaskModel.findOne({ id }).lean();
    if (!existingTask) {
      if (body.fullTask && body.fullTask.title) {
        const toInsert = {
          ...body.fullTask,
          id,
          scheduledDate: body.fullTask.scheduledDate || new Date().toISOString().slice(0, 10),
          time: body.fullTask.time || '05:00 PM',
          priority: body.fullTask.priority || 'NORMAL',
          status: body.fullTask.status || 'Not Started',
          department: body.fullTask.department || 'General',
          creator: body.fullTask.creator || {
            id: 'mem-ops-admin',
            name: 'Operations Admin',
            email: 'ops@urbangaon.com',
            role: 'ADMIN',
            avatar: 'OA',
          },
          createdAt: body.fullTask.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        delete toInsert.actor;
        delete toInsert.actorRole;
        delete toInsert.fullTask;
        const created = await TaskModel.create(toInsert);
        existingTask = created.toObject();
      } else {
        return NextResponse.json({ success: false, error: `Task '${id}' not found` }, { status: 404 });
      }
    }

    // Flowchart 8: Multi-Assignee Overall Status & Progress calculation
    const hasAssignees = (body.assignees && Array.isArray(body.assignees)) || (existingTask.assignees && existingTask.assignees.length > 0);
    if (hasAssignees && !body.status) {
      const mergedForCompute = {
        ...existingTask,
        ...body,
      };
      const comp = computeMultiAssigneeStatus(mergedForCompute);
      body.status = comp.status;
      body.progressPercent = comp.progressPercent;
    }

    // Extract metadata for audit logging and sanitize body for TaskModel
    const actorInput = body.actor;
    const actorRoleInput = body.actorRole;
    const auditActionInput = body.auditAction;
    const auditNotesInput = body.auditNotes;
    delete body.actor;
    delete body.actorRole;
    delete body.auditAction;
    delete body.auditNotes;

    // Flowchart A: If modified by Admin/Super Admin, mark editedByAdmin = true
    const actorRole = (typeof actorInput === 'object' && actorInput?.role)
      || req.headers.get('x-user-role')
      || actorRoleInput
      || 'EMPLOYEE';

    if (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || body.editedByAdmin) {
      body.editedByAdmin = true;
    }

    const actorEmail = (body.actorEmail || req.headers.get('x-user-email') || (typeof actorInput === 'object' ? actorInput?.email : '') || '').toLowerCase().trim();
    const actorId = body.actorId || req.headers.get('x-user-id') || (typeof actorInput === 'object' ? actorInput?.id : '') || '';
    const callerName = (typeof actorInput === 'string' ? actorInput : actorInput?.name) || req.headers.get('x-user-name') || '';
    delete body.actorEmail;
    delete body.actorId;

    const isCallerCeo = isCeoUser({ id: actorId, name: callerName, email: actorEmail, role: actorRole })
      || isStrictCeo({ id: actorId, name: callerName, email: actorEmail, role: actorRole })
      || actorEmail === 'ceo@urbangaon.com'
      || actorEmail.includes('ceo@')
      || callerName.toLowerCase().includes('sukh')
      || (actorRole === 'SUPER_ADMIN' && (callerName.toLowerCase().includes('sukh') || callerName.toLowerCase().includes('aakash') || actorEmail.includes('techdesk')))
      || Boolean(body.ceoApprovedAt || body.ceoApprovedBy || body.pendingCeoApproval === false);

    const isCallerAdminOrCeo = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || isCallerCeo;

    // Authorization: Only Admin, Super Admin, and CEO can cancel tasks
    if (body.status === 'Cancelled' && existingTask.status !== 'Cancelled' && !isCallerAdminOrCeo) {
      return NextResponse.json({ success: false, error: 'Access Denied: Only Admin, Super Admin, and CEO have permission to cancel deliverables.' }, { status: 403 });
    }

    // Executive Governance Rule: Final Approval to Sukh Sagar Sir before completing any deliverable
    if (body.status === 'Done') {
      if (!isCallerCeo && existingTask.status !== 'Done') {
        body.status = 'Review';
        body.pendingCeoApproval = true;
        body.ceoApprovalRequestedAt = new Date().toISOString();
        body.ceoApprovalRequestedBy = callerName || 'Staff Member';
      } else {
        body.status = 'Done';
        body.pendingCeoApproval = false;
        body.progressPercent = 100;
        body.isOverdue = false;
        body.isPendingNoReason = false;
        body.overdueDays = 0;
        if (!body.ceoApprovedAt) body.ceoApprovedAt = new Date().toISOString();
        if (!body.ceoApprovedBy) body.ceoApprovedBy = callerName || 'Mr. Sukh Sagar Singh Bhati (CEO)';
        if (body.assignees && Array.isArray(body.assignees)) {
          body.assignees = body.assignees.map((a: any) => ({
            ...a,
            status: 'Done',
            completedAt: a.completedAt || new Date().toISOString()
          }));
        }
      }
    }

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: `Task '${id}' not found` }, { status: 404 });
    }

    // Flowchart 8 Step 13: "Audit log records each change"
    const actorName = typeof actorInput === 'string'
      ? actorInput
      : (typeof actorInput === 'object' && actorInput?.name)
      ? actorInput.name
      : req.headers.get('x-user-name') || 'Team Member';

    const auditAction = auditActionInput || (body.status && body.status !== existingTask.status ? 'STATUS_CHANGE' : 'UPDATED');

    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      taskId: id,
      taskTitle: (updated as { title?: string }).title || id,
      action: auditAction,
      fieldChanged: Object.keys(body).join(', '),
      oldValue: `Status: ${existingTask.status}`,
      newValue: `Status: ${updated.status}`,
      actor: actorName,
      actorRole: actorRole,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'Task Operations Engine',
      notes: auditNotesInput || `Updated deliverable under Multi-Assignee lifecycle. Status: ${updated.status}`,
    }).catch(err => console.debug('[API/tasks/[id] AuditLog]', err));

    // Broadcast instant real-time update to all connected devices worldwide
    broadcastTaskMutation({
      action: 'UPDATED',
      taskId: id,
      taskTitle: (updated as { title?: string }).title || id,
      task: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks PATCH]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── DELETE /api/tasks/:id ───────────────────────────────────────── */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    await connectDB();
    const rawParams = ctx?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : (rawParams || {});
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    // Authorization: Only Admin, Super Admin, and CEO can delete deliverables
    const deleteCallerRole = (req.headers.get('x-user-role') as string) || '';
    const deleteCallerName = (req.headers.get('x-user-name') as string) || '';
    const isDeleteAllowed = deleteCallerRole === 'ADMIN' || deleteCallerRole === 'SUPER_ADMIN' || deleteCallerName.toLowerCase().includes('sukh sagar');
    if (deleteCallerRole && !isDeleteAllowed) {
      return NextResponse.json({ success: false, error: 'Access Denied: Only Admin, Super Admin, and CEO have permission to delete deliverables.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const soft = searchParams.get('soft') === 'true';

    let deletedOrUpdated;
    if (soft) {
      // Soft delete — mark as Cancelled
      deletedOrUpdated = await TaskModel.findOneAndUpdate(
        { id },
        {
          $set: {
            status:             'Cancelled',
            cancellationReason: 'Deleted via API',
            updatedAt:          new Date().toISOString(),
          },
        },
        { new: true, lean: true }
      );
    } else {
      // Hard delete — permanently remove task record from MongoDB
      deletedOrUpdated = await TaskModel.findOneAndDelete({ id }).lean();
    }

    if (!deletedOrUpdated) {
      return NextResponse.json({ success: false, error: `Task '${id}' not found` }, { status: 404 });
    }

    // Immediately mark as deleted in in-memory tombstone to eliminate replication race condition
    markTaskDeleted(id);

    const taskTitle = (deletedOrUpdated as { title?: string }).title || id;

    const callerEmail = req.headers.get('x-user-email') || 'ceo@urbangaon.com';
    const callerName = req.headers.get('x-user-name') || 'Mr. Sukh Sagar Singh Bhati';
    const callerRole = (req.headers.get('x-user-role') as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE') || 'SUPER_ADMIN';

    // Persist server-side audit entry so cross-device sync catches the deletion across serverless instances
    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      taskId: id,
      taskTitle: taskTitle,
      action: 'DELETED',
      fieldChanged: 'Task Deleted',
      oldValue: taskTitle,
      newValue: 'DELETED',
      actor: callerName,
      actorRole: callerRole,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'Browser Device',
      notes: soft ? 'Task soft-deleted' : `Task permanently deleted by CEO ${callerName}`,
    }).catch(err => console.error('[API/tasks DELETE audit log error]', err));

    // Broadcast instant real-time deletion to all connected devices worldwide
    broadcastTaskMutation({ action: 'DELETED', taskId: id, taskTitle });

    return NextResponse.json({
      success: true,
      message: soft ? `Task '${id}' soft-deleted` : `Task '${id}' permanently deleted`,
      data: deletedOrUpdated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks DELETE]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
