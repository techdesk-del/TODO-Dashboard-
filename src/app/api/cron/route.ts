/**
 * app/api/cron/route.ts
 * GET  /api/cron — Check status and initialize cron daemon
 * POST /api/cron — Manually trigger either 'rollover' or 'digest'
 */

import { NextRequest, NextResponse } from 'next/server';
import { initServerCron, executeNightlyRollover } from '@/lib/cron';

export async function GET() {
  initServerCron();
  return NextResponse.json({
    success: true,
    status: 'ACTIVE',
    jobs: [
      { name: 'Morning Email Digest', cronSchedule: '08:30 AM Daily (30 8 * * *)' },
      { name: 'Nightly Carry-Forward Rollover', cronSchedule: '00:05 AM Daily (5 0 * * *)' },
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
      const res = await executeNightlyRollover();
      return NextResponse.json({
        success: true,
        action: 'rollover',
        ...res,
        message: 'Nightly rollover executed successfully.',
      });
    }

    if (action === 'digest') {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const digestRes = await fetch(`${host}/api/reminders/digest`, { method: 'POST' });
      const data = await digestRes.json();
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
        message: 'Flowchart 25 Data retention executed successfully.'
      });
    }

    if (action === 'overdue') {
      const { runOverdueAndNoReasonEvaluation } = await import('@/lib/overdueEngine');
      const data = await runOverdueAndNoReasonEvaluation({
        thresholdDays: body.thresholdDays || 3,
        sendNotifications: body.sendNotifications !== false
      });
      return NextResponse.json({
        success: true,
        action: 'overdue',
        data,
        message: 'Flowchart 21 Overdue evaluation executed successfully.'
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
