/**
 * app/api/realtime/route.ts — Cross-Device Real-Time SSE Stream
 *
 * WHY THIS APPROACH:
 * Vercel serverless functions are STATELESS — each invocation runs in an isolated
 * process. In-memory EventEmitters (Node.js) are local to a single function instance
 * and cannot communicate across devices or across Vercel instances.
 *
 * SOLUTION: MongoDB Atlas as the shared event bus.
 * This SSE endpoint polls MongoDB every 2 seconds for any task updated/created
 * AFTER the client connected. When it detects a change, it pushes an SSE event.
 * All devices share the same MongoDB Atlas cluster → true cross-device sync.
 *
 * Compatible with: Vercel Serverless, Edge, local dev, any stateless deployment.
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Vercel serverless max duration (Pro: 300s, Hobby: 30s)
// We stream for up to 25s then close; client auto-reconnects.
const MAX_STREAM_DURATION_MS = 25000;
const POLL_INTERVAL_MS = 2000;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  // The timestamp when this client connected — we only notify about changes AFTER this
  const connectedAt = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      let isAborted = false;
      let lastChangeAt = connectedAt;

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        isAborted = true;
      });

      // Helper to send SSE events
      const send = (event: string, data: unknown) => {
        if (isAborted) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          isAborted = true;
        }
      };

      // 1. Greet the client
      send('connected', {
        status: 'connected',
        time: Date.now(),
        mode: 'mongodb-poll',
        pollIntervalMs: POLL_INTERVAL_MS,
      });

      // 2. Connect to MongoDB
      try {
        await connectDB();
      } catch (err) {
        send('error', { message: 'DB connection failed', error: String(err) });
        controller.close();
        return;
      }

      // 3. Polling loop — check for new/updated tasks since lastChangeAt
      const startTime = Date.now();

      while (!isAborted && (Date.now() - startTime) < MAX_STREAM_DURATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        if (isAborted) break;

        try {
          // Find any task created or updated since lastChangeAt
          // Tasks with updatedAt > lastChangeAt means something changed
          const changed = await TaskModel.findOne({
            updatedAt: { $gt: lastChangeAt },
          })
            .sort({ updatedAt: -1 })
            .select('id updatedAt status title')
            .lean()
            .exec();

          if (changed && changed.updatedAt) {
            lastChangeAt = changed.updatedAt;
            send('task_mutation', {
              action: 'UPDATED',
              taskId: changed.id,
              taskTitle: changed.title,
              status: changed.status,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          // Send heartbeat every poll tick to keep connection alive
          if (!isAborted) {
            try {
              controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
            } catch {
              isAborted = true;
            }
          }
        } catch {
          // DB error during poll — send heartbeat and continue
          if (!isAborted) {
            try {
              controller.enqueue(encoder.encode(`: poll-error ${Date.now()}\n\n`));
            } catch {
              isAborted = true;
            }
          }
        }
      }

      // 4. Stream duration reached — signal client to reconnect
      if (!isAborted) {
        send('reconnect', { reason: 'stream-cycle', reconnectAfterMs: 100 });
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
