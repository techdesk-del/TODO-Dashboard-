import { NextResponse } from 'next/server';
import { parseSpeechOrTextCommand } from '@/lib/aiParser';

export async function POST(request: Request) {
  try {
    const { prompt, currentUser } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const parsed = parseSpeechOrTextCommand(prompt, currentUser);
    return NextResponse.json({
      success: true,
      extracted: parsed,
      meta: {
        model: 'OpenAI Whisper + Structured LLM Parser',
        latencyMs: parsed.latencyMs,
        under180ms: parsed.latencyMs < 180
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
