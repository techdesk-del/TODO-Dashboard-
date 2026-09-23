/**
 * app/api/realtime/route.ts — Server-Sent Events (SSE) Real-Time Stream
 *
 * Pushes live task updates to any client device worldwide in real-time.
 */

import { NextRequest } from 'next/server';
import { realtimeEmitter, REALTIME_EVENTS } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection greeting
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`));

      // 2. Event listener for task mutations
      const onTaskMutation = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: task_mutation\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      //

      realtimeEmitter.on(REALTIME_EVENTS.TASK_MUTATION, onTaskMutation);

      // 3. Keep-alive heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        realtimeEmitter.off(REALTIME_EVENTS.TASK_MUTATION, onTaskMutation);
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disables Nginx buffering for immediate delivery
    },
  });
}
