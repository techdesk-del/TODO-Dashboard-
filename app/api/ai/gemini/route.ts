/**
 * app/api/ai/gemini/route.ts
 * POST /api/ai/gemini — Extract task entity via Google Gemini AI (or local fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTaskWithGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';
    const audioBase64 = body.audioBase64;
    const mimeType = body.mimeType || 'audio/webm';

    if (!prompt && !audioBase64) {
      return NextResponse.json(
        { success: false, error: 'Either prompt text or audioBase64 is required' },
        { status: 400 }
      );
    }

    const result = await extractTaskWithGemini(prompt, audioBase64, mimeType);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        model: result.modelUsed,
        latencyMs: result.latencyMs,
        isGeminiLive: result.modelUsed.includes('Google Gemini'),
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
