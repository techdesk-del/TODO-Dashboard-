/**
 * app/api/notifications/dispatch/route.ts
 * POST: Centralized Flowchart 20 Notification Dispatcher Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotificationFlow, DispatchNotificationEvent } from '@/lib/notificationDispatcher';

export async function POST(req: NextRequest) {
  try {
    const body: DispatchNotificationEvent = await req.json();

    if (!body.eventType || !body.recipients || !Array.isArray(body.recipients)) {
      return NextResponse.json(
        { success: false, error: 'Missing required eventType or recipients array' },
        { status: 400 }
      );
    }

    const result = await dispatchNotificationFlow(body);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Flowchart 20 dispatch executed: ${result.inAppCreatedCount} in-app created, ${result.emailResults.length} email records processed.`,
    });
  } catch (error: any) {
    console.error('[API /api/notifications/dispatch Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Dispatch failed' },
      { status: 500 }
    );
  }
}
