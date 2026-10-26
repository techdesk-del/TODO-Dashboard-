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

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    initServerCron();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Overdue and No-Reason Engine (Hourly IST Vercel Cron)
    if (action === 'overdue') {
      const { runOverdueAndNoReasonEvaluation } = await import('@/lib/overdueEngine');
      const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://todo.urbangaon.com';
      const result = await runOverdueAndNoReasonEvaluation({
        thresholdDays: 3,
        sendNotifications: true,
        baseUrl: origin,
      });
      return NextResponse.json({
        success: true,
        action: 'overdue',
        data: result,
        message: `Overdue and No-Reason evaluation executed via Vercel Cron: ${result.overdueCount} overdue, ${result.notificationsDispatched} notifications sent.`,
      });
    }

    // 2. Morning Email Digest + Overdue Evaluation (08:30 AM IST Vercel Cron)
    if (action === 'digest') {
      const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://todo.urbangaon.com';

      // Auto-evaluate overdue deadlines and delay reasons before dispatching morning digests
      try {
        const { runOverdueAndNoReasonEvaluation } = await import('@/lib/overdueEngine');
        await runOverdueAndNoReasonEvaluation({
          thresholdDays: 3,
          sendNotifications: true,
          baseUrl: origin,
        });
      } catch (e) {
        console.warn('[Vercel Cron 08:30 AM IST] Pre-digest overdue evaluation note:', e);
      }

      const result = await runMorningDigest({
        force: searchParams.get('force') === 'true',
        origin,
        actor: 'Vercel Cron 08:30 AM IST',
      });
      return NextResponse.json({
        success: true,
        action: 'digest',
        data: result,
      });
    }

    // 3. Nightly Carry-Forward Rollover (00:05 AM IST Vercel Cron)
    if (action === 'rollover') {
      const result = await executeNightlyRollover({
        actor: 'Vercel Cron 00:05 AM IST',
      });
      return NextResponse.json({
        success: true,
        action: 'rollover',
        data: result,
      });
    }

    // 4. Data Retention & Archive (02:00 AM IST Vercel Cron)
    if (action === 'retention') {
      const { executeDataRetention } = await import('@/lib/retentionEngine');
      const result = await executeDataRetention({
        taskRetentionDays: 365,
        auditRetentionDays: 730,
        actor: 'Vercel Cron 02:00 AM IST (Flowchart 25)',
        actorRole: 'SUPER_ADMIN',
      });
      return NextResponse.json({
        success: true,
        action: 'retention',
        data: result,
      });
    }

    return NextResponse.json({
      success: true,
      status: 'ACTIVE',
      environment: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Local',
      timezone: 'Asia/Kolkata (IST)',
      jobs: [
        { name: 'Morning Email Digest', cronSchedule: '08:30 AM IST Daily (0 3 * * * UTC)' },
        { name: 'Nightly Carry-Forward Rollover', cronSchedule: '00:05 AM IST Daily (35 18 * * * UTC)' },
        { name: 'Overdue & SLA Engine', cronSchedule: 'Hourly IST (0 * * * * UTC)' },
        { name: 'Data Retention & Archive', cronSchedule: '02:00 AM IST Daily (30 20 * * * UTC)' },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cron execution failed';
    console.error('[API/cron GET error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
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
