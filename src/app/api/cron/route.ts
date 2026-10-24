/**
 * app/api/cron/route.ts
 * GET  /api/cron — Check status and initialize background schedulers
 * POST /api/cron — Manually execute 'rollover', 'digest', or 'retention'
 */

import { NextRequest, NextResponse } from 'next/server';
import { initServerCron, executeNightlyRollover } from '@/lib/cron';
import { runMorningDigest } from '@/lib/digestEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  initServerCron();
  return NextResponse.json({
    success: true,
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata (IST)',
    jobs: [
      { name: 'Morning Email Digest', cronSchedule: '08:30 AM IST Daily (30 8 * * *)' },
      { name: 'Nightly Carry-Forward Rollover', cronSchedule: '00:05 AM IST Daily (5 0 * * *)' },
      { name: 'Overdue & SLA Engine', cronSchedule: 'Hourly IST (0 * * * *)' },
      { name: 'Data Retention & Archive', cronSchedule: '02:00 AM IST Daily (0 2 * * *)' },
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    initServerCron();
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'rollover';

    if (action === 'rollover') {
      const res = await executeNightlyRollover({
        forceShiftTodayToTomorrow: body.forceShiftTodayToTomorrow ?? true,
        actor: body.actor || 'Manual API Trigger',
        actorRole: body.actorRole || 'SUPER_ADMIN'
      });
      return NextResponse.json({
        action: 'rollover',
        ...res,
      });
    }

    if (action === 'digest') {
      const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const data = await runMorningDigest({
        targetEmail: body.email,
        targetName: body.name,
        force: body.force ?? true,
        origin,
        actor: body.actor || 'Manual API Digest Trigger'
      });
      return NextResponse.json({
        success: true,
        action: 'digest',
        data,
      });
    }

    if (action === 'retention') {
      const { executeDataRetention } = await import('@/lib/retentionEngine');
      const data = await executeDataRetention({
        taskRetentionDays: body.taskRetentionDays || 365,
        auditRetentionDays: body.auditRetentionDays || 730,
        actor: 'Cron POST Trigger (Flowchart 25)',
        actorRole: 'SUPER_ADMIN'
      });
      return NextResponse.json({
        success: true,
        action: 'retention',
        data,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cron execution failed';
    console.error('[API/cron error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
