/**
 * app/api/tasks/evaluate-overdue/route.ts
 *
 * GET & POST: Flowchart 21 Overdue and No-Reason Auto-Flag Evaluation API
 * Scans all pending tasks, flags overdue deadlines, evaluates delay reasons,
 * notifies assignees & managers, and escalates tasks exceeding threshold days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOverdueAndNoReasonEvaluation } from '@/lib/overdueEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thresholdDays = searchParams.get('thresholdDays') ? parseInt(searchParams.get('thresholdDays')!, 10) : 3;
    const sendNotifications = searchParams.get('sendNotifications') !== 'false';
    const baseUrl = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const result = await runOverdueAndNoReasonEvaluation({
      thresholdDays,
      sendNotifications,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Overdue evaluation completed: ${result.overdueCount} overdue (${result.pendingNoReasonCount} missing reason), ${result.autoEscalatedCount} escalated.`,
    });
  } catch (error: any) {
    console.error('[API /api/tasks/evaluate-overdue GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Evaluation failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty json body
    }

    const thresholdDays = typeof body.thresholdDays === 'number' ? body.thresholdDays : 3;
    const sendNotifications = body.sendNotifications !== false;
    const baseUrl = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const result = await runOverdueAndNoReasonEvaluation({
      thresholdDays,
      sendNotifications,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Overdue evaluation completed: ${result.overdueCount} overdue (${result.pendingNoReasonCount} missing reason), ${result.autoEscalatedCount} escalated.`,
    });
  } catch (error: any) {
    console.error('[API /api/tasks/evaluate-overdue POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Evaluation failed' },
      { status: 500 }
    );
  }
}
