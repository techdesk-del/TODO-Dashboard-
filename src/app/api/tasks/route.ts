/**
 * app/api/tasks/route.ts
 * GET  /api/tasks        — fetch tasks (optional ?date=YYYY-MM-DD filter)
 * POST /api/tasks        — create a new task (seeds DB if empty)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { INITIAL_TASKS, INITIAL_MEMBERS } from '@/lib/mockData';
import { broadcastTaskMutation } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ── Helpers ─────────────────────────────────────────────────────── */
async function seedIfEmpty(forceSeed = false) {
  const memberCount = await MemberModel.countDocuments();
  if (memberCount === 0) {
    await MemberModel.insertMany(INITIAL_MEMBERS, { ordered: false });
    console.log(`[API/tasks] ✓ Seeded ${INITIAL_MEMBERS.length} members`);
  }

  if (forceSeed) {
    const count = await TaskModel.countDocuments();
    if (count === 0) {
      await TaskModel.insertMany(INITIAL_TASKS, { ordered: false });
      console.log(`[API/tasks] ✓ Seeded ${INITIAL_TASKS.length} tasks`);
    }
  }
}

/* ── GET /api/tasks ──────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const shouldSeed = searchParams.get('seed') === 'true';
    await seedIfEmpty(shouldSeed);
    const date       = searchParams.get('date');       // YYYY-MM-DD
    const assigneeId = searchParams.get('assigneeId'); // member drilldown
    const status     = searchParams.get('status');     // filter by status

    // Build query dynamically
    const query: Record<string, unknown> = {};
    if (date)       query['scheduledDate'] = date;
    if (assigneeId) query['assignees.id']  = assigneeId;
    if (status)     query['status']        = status;

    const tasks = await TaskModel
      .find(query)
      .sort({ scheduledDate: 1, createdAt: -1 })
      .lean()     // Returns plain JS objects (faster, no Mongoose overhead)
      .exec();

    return NextResponse.json({
      success:  true,
      data:     tasks,
      meta: {
        count:    tasks.length,
        latencyMs: Date.now() - t0,
        database: 'MongoDB Atlas',
        cached:   false,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── POST /api/tasks ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    await connectDB();
    await seedIfEmpty();

    const body = await req.json();

    // Validate required fields
    const required = ['id', 'title', 'scheduledDate', 'time', 'priority', 'status', 'creator', 'department'];
    const missing  = required.filter(k => !body[k]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert — safe to call multiple times
    const task = await TaskModel.findOneAndUpdate(
      { id: body.id },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { upsert: true, new: true, lean: true }
    );

    // Broadcast instant real-time event to all connected devices worldwide
    broadcastTaskMutation({ action: 'CREATED', taskId: task?.id || body.id });

    return NextResponse.json({
      success:  true,
      data:     task,
      latencyMs: Date.now() - t0,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── DELETE /api/tasks (Clear all deliverables for fresh testing) ── */
export async function DELETE() {
  try {
    await connectDB();
    const result = await TaskModel.deleteMany({});
    console.log(`[API/tasks DELETE] Cleared ${result.deletedCount} tasks from MongoDB Atlas`);

    // Broadcast mutation to instantly notify all devices in real-time
    broadcastTaskMutation({ action: 'DELETED_ALL', taskId: 'all' });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deletedCount} tasks from MongoDB Atlas`,
      deletedCount: result.deletedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks DELETE]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
