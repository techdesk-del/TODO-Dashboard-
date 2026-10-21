/**
 * app/api/notifications/email-logs/route.ts
 * GET: Fetch email logs & Admin failure summary (Flowchart 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { EmailLogModel } from '@/models/EmailLog';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const failuresOnly = searchParams.get('failuresOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: Record<string, any> = {};
    if (failuresOnly) {
      query.status = 'FAILED';
    }

    const logs = await EmailLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    const failureCount = await EmailLogModel.countDocuments({ status: 'FAILED' });
    const deliveredCount = await EmailLogModel.countDocuments({ status: 'DELIVERED' });

    return NextResponse.json({
      success: true,
      data: logs,
      stats: {
        total: deliveredCount + failureCount,
        delivered: deliveredCount,
        failed: failureCount,
      },
      adminFailureSummary: logs.filter(l => l.status === 'FAILED'),
    });
  } catch (error: any) {
    console.error('[API /api/notifications/email-logs Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
