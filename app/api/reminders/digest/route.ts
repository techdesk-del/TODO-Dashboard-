/**
 * app/api/reminders/digest/route.ts
 * POST /api/reminders/digest — Send morning email digest via corporate SMTP
 * 
 * Flowchart D & Flowchart 13:
 * Accepts optional query parameters or JSON body:
 * - email?: string (single recipient email)
 * - name?: string (recipient display name)
 * - force?: boolean (bypass holiday/Sunday suppression for manual dispatch)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMorningDigest } from '@/lib/digestEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const { searchParams } = new URL(req.url);
    const targetEmail = (body.email as string) || searchParams.get('email') || undefined;
    const targetName = (body.name as string) || searchParams.get('name') || undefined;
    const force = body.force === true || searchParams.get('force') === 'true';
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const result = await runMorningDigest({
      targetEmail,
      targetName,
      force,
      origin,
      actor: body.actor || 'API / UI Manual Dispatch',
      actorRole: body.actorRole || 'SUPER_ADMIN'
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/reminders/digest error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
