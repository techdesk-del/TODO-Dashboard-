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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

/* ── PATCH /api/tasks/:id ────────────────────────────────────────── */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await connectDB();
    const { id } = await ctx.params;
    const body   = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    // Never allow overriding the task's id through a PATCH
    delete body.id;

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: `Task '${id}' not found` }, { status: 404 });
    }

    // Broadcast instant real-time update to all connected devices worldwide
    broadcastTaskMutation({ action: 'UPDATED', taskId: id });

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
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
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
      actor: 'System / User',
      actorRole: 'EMPLOYEE',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'Browser Device',
      notes: soft ? 'Task soft-deleted' : 'Task permanently deleted from database',
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
