/**
 * app/api/tasks/[id]/route.ts
 * PATCH  /api/tasks/:id  — partial update (status, assignees, reasons, etc.)
 * DELETE /api/tasks/:id  — soft delete (set status = 'Cancelled')
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { broadcastTaskMutation } from '@/lib/events';

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
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await connectDB();
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    // Soft delete — never permanently remove task data
    const updated = await TaskModel.findOneAndUpdate(
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

    if (!updated) {
      return NextResponse.json({ success: false, error: `Task '${id}' not found` }, { status: 404 });
    }

    // Broadcast instant real-time deletion to all connected devices worldwide
    broadcastTaskMutation({ action: 'DELETED', taskId: id });

    return NextResponse.json({ success: true, message: `Task '${id}' soft-deleted`, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks DELETE]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
