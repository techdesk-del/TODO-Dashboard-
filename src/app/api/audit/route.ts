/**
 * app/api/audit/route.ts
 * GET  /api/audit  — Fetch audit logs (optional ?taskId=... or ?actor=... filter)
 * POST /api/audit  — Create a new audit log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLogModel } from '@/models/AuditLog';
import { INITIAL_AUDIT_LOGS } from '@/lib/mockData';

async function seedAuditIfEmpty() {
  const count = await AuditLogModel.countDocuments();
  if (count === 0) {
    console.log('[API/audit] Empty collection — seeding with mock data...');
    await AuditLogModel.insertMany(INITIAL_AUDIT_LOGS, { ordered: false });
    console.log(`[API/audit] ✓ Seeded ${INITIAL_AUDIT_LOGS.length} audit logs`);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await seedAuditIfEmpty();

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const actor = searchParams.get('actor');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const query: Record<string, unknown> = {};
    if (taskId) query['taskId'] = taskId;
    if (actor) query['actor'] = actor;

    const logs = await AuditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/audit GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    if (!body.action || !body.actor) {
      return NextResponse.json(
        { success: false, error: 'Missing required audit fields: action and actor' },
        { status: 400 }
      );
    }

    const entry = await AuditLogModel.create({
      id: body.id || `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      actor: body.actor,
      actorRole: body.actorRole || 'TEAM_MEMBER',
      action: body.action,
      fieldChanged: body.fieldChanged,
      oldValue: body.oldValue,
      newValue: body.newValue,
      notes: body.notes,
      ipAddress: body.ipAddress || req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: body.deviceInfo || req.headers.get('user-agent') || 'Browser Client',
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/audit POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
