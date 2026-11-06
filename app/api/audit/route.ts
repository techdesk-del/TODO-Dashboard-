/**
 * app/api/audit/route.ts
 * GET  /api/audit  — Fetch audit logs (optional ?taskId=... or ?actor=... filter)
 * POST /api/audit  — Create a new audit log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLogModel } from '@/models/AuditLog';
import { INITIAL_AUDIT_LOGS } from '@/shared/lib/mockData';
import { canViewAuditTrail } from '@/shared/lib/rosterData';
import { getAuthenticatedUser, sanitizeInput } from '@/lib/security';

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
    const user = getAuthenticatedUser(req);
    // Strictly verify caller authentication & authorization via JWT session
    const isAllowed = user && (user.isFounder || canViewAuditTrail({ email: user.email, role: user.role }));
    if (!isAllowed) {
      return NextResponse.json({
        success: false,
        error: 'Access Denied: Audit trail is strictly restricted to Executive Leadership (Founder & System Administrator). Valid session token required.',
        data: [],
        count: 0
      }, { status: 403 });
    }

    await connectDB();
    await seedAuditIfEmpty();

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const actor = searchParams.get('actor');
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '1000', 10)));

    const query: Record<string, unknown> = {};
    if (taskId && typeof taskId === 'string') query['taskId'] = String(taskId).replace(/[${}]/g, '');
    if (actor && typeof actor === 'string') query['actor'] = String(actor).replace(/[${}]/g, '');

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
