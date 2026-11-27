/**
 * app/api/realtime/route.ts — Full-Database Cross-Device Real-Time SSE Stream
 *
 * Syncs EVERY MongoDB Atlas collection in real time (<50ms via in-process EventEmitter
 * + 1s MongoDB Atlas Change Detection across all devices & server instances):
 *  - Tasks (CREATED / UPDATED / DELETED)
 *  - Members & PurgedMembers (CREATED / UPDATED / DEACTIVATED / DELETED)
 *  - In-App Notifications (CREATED / READ / READ_ALL)
 *  - System Config (global_system_config updates)
 *  - Audit Logs (live immutable stream for Executive/CEO portal)
 *  - Access Requests (live HR/Admin onboarding requests)
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { AuditLogModel } from '@/models/AuditLog';
import { InAppNotificationModel } from '@/models/InAppNotification';
import { SystemConfigModel } from '@/models/SystemConfig';
import { AccessRequestModel } from '@/models/AccessRequest';
import { realtimeEmitter, REALTIME_EVENTS } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const MAX_STREAM_DURATION_MS = 14000;
const POLL_INTERVAL_MS = 1000;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const connectedAt = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      let isAborted = false;
      let lastTaskUpdatedAt = connectedAt;
      let lastAuditAt = connectedAt;
      let lastMemberUpdatedAt = connectedAt;
      let lastPurgedAt = connectedAt;
      let lastNotifAt = connectedAt;
      let lastConfigUpdatedAt = connectedAt;
      let lastAccessReqAt = connectedAt;

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

      // Instant in-process broadcasts (<50ms delivery across all connected clients)
      const onTaskMutation = (payload: unknown) => send('task_mutation', payload);
      const onMemberMutation = (payload: unknown) => send('member_mutation', payload);
      const onNotifMutation = (payload: unknown) => send('notification_mutation', payload);
      const onConfigMutation = (payload: unknown) => send('config_mutation', payload);
      const onAuditLog = (payload: unknown) => send('audit_log', payload);
      const onAccessReqMutation = (payload: unknown) => send('access_request_mutation', payload);

      realtimeEmitter.on(REALTIME_EVENTS.TASK_MUTATION, onTaskMutation);
      realtimeEmitter.on(REALTIME_EVENTS.MEMBER_MUTATION, onMemberMutation);
      realtimeEmitter.on(REALTIME_EVENTS.NOTIFICATION_MUTATION, onNotifMutation);
      realtimeEmitter.on(REALTIME_EVENTS.CONFIG_MUTATION, onConfigMutation);
      realtimeEmitter.on(REALTIME_EVENTS.AUDIT_LOG, onAuditLog);
      realtimeEmitter.on(REALTIME_EVENTS.ACCESS_REQUEST_MUTATION, onAccessReqMutation);

      const cleanupListeners = () => {
        realtimeEmitter.off(REALTIME_EVENTS.TASK_MUTATION, onTaskMutation);
        realtimeEmitter.off(REALTIME_EVENTS.MEMBER_MUTATION, onMemberMutation);
        realtimeEmitter.off(REALTIME_EVENTS.NOTIFICATION_MUTATION, onNotifMutation);
        realtimeEmitter.off(REALTIME_EVENTS.CONFIG_MUTATION, onConfigMutation);
        realtimeEmitter.off(REALTIME_EVENTS.AUDIT_LOG, onAuditLog);
        realtimeEmitter.off(REALTIME_EVENTS.ACCESS_REQUEST_MUTATION, onAccessReqMutation);
      };

      req.signal.addEventListener('abort', () => {
        isAborted = true;
        cleanupListeners();
      });

      send('connected', {
        status: 'connected',
        time: Date.now(),
        mode: 'mongodb-full-realtime',
        collections: ['tasks', 'members', 'purgedMembers', 'notifications', 'systemConfig', 'auditLogs', 'accessRequests'],
        pollIntervalMs: POLL_INTERVAL_MS,
      });

      try {
        await connectDB();
      } catch (err) {
        cleanupListeners();
        send('error', { message: 'DB connection failed', error: String(err) });
        controller.close();
        return;
      }

      const startTime = Date.now();

      while (!isAborted && Date.now() - startTime < MAX_STREAM_DURATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (isAborted) break;

        try {
          // Run all MongoDB Atlas change-detection queries in parallel for minimal latency
          const [
            changedTasks,
            newAuditEntries,
            changedMembers,
            newPurged,
            newNotifs,
            changedConfig,
            changedAccessReqs,
          ] = await Promise.all([
            TaskModel.find({ updatedAt: { $gt: lastTaskUpdatedAt } })
              .sort({ updatedAt: 1 })
              .limit(50)
              .lean()
              .exec(),
            AuditLogModel.find({ timestamp: { $gt: lastAuditAt } })
              .sort({ timestamp: 1 })
              .limit(30)
              .lean()
              .exec(),
            MemberModel.find({ updatedAt: { $gt: lastMemberUpdatedAt } })
              .sort({ updatedAt: 1 })
              .limit(30)
              .lean()
              .exec(),
            PurgedMemberModel.find({ purgedAt: { $gt: lastPurgedAt } })
              .sort({ purgedAt: 1 })
              .limit(20)
              .lean()
              .exec(),
            InAppNotificationModel.find({ createdAt: { $gt: lastNotifAt } })
              .sort({ createdAt: 1 })
              .limit(30)
              .lean()
              .exec(),
            SystemConfigModel.findOne({
              key: 'global_system_config',
              updatedAt: { $gt: lastConfigUpdatedAt },
            })
              .lean()
              .exec(),
            AccessRequestModel.find({ updatedAt: { $gt: lastAccessReqAt } })
              .sort({ updatedAt: 1 })
              .limit(20)
              .lean()
              .exec(),
          ]);

          // 1. Tasks
          for (const changed of changedTasks) {
            if (changed.updatedAt && changed.updatedAt > lastTaskUpdatedAt) {
              lastTaskUpdatedAt = changed.updatedAt;
            }
            const isNew = Boolean(
              changed.createdAt &&
              Math.abs(new Date(changed.updatedAt || '').getTime() - new Date(changed.createdAt).getTime()) < 3000
            );
            send('task_mutation', {
              action: isNew ? 'CREATED' : 'UPDATED',
              taskId: changed.id,
              taskTitle: changed.title,
              status: changed.status,
              task: changed,
              updates: changed,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          // 2. Audit Logs (+ DELETED task notifications)
          for (const entry of newAuditEntries) {
            if (entry.timestamp && entry.timestamp > lastAuditAt) {
              lastAuditAt = entry.timestamp;
            }
            send('audit_log', { entry, timestamp: Date.now(), source: 'mongodb-changedetect' });
            if (entry.action === 'DELETED' && entry.taskId) {
              send('task_mutation', {
                action: 'DELETED',
                taskId: entry.taskId,
                taskTitle: entry.taskTitle,
                timestamp: Date.now(),
                source: 'mongodb-audit-deletions',
              });
            }
          }

          // 3. Members
          for (const cm of changedMembers) {
            const memberObj = cm as unknown as Record<string, unknown>;
            const uAt = String(memberObj.updatedAt || '');
            if (uAt && uAt > lastMemberUpdatedAt) {
              lastMemberUpdatedAt = uAt;
            }
            send('member_mutation', {
              action: memberObj.status === 'DEACTIVATED' ? 'DEACTIVATED' : 'UPDATED',
              memberId: memberObj.id,
              memberName: memberObj.name,
              memberEmail: memberObj.email,
              status: memberObj.status,
              member: memberObj,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          // 4. Purged Members (hard deletes)
          for (const pm of newPurged) {
            const pmObj = pm as unknown as Record<string, unknown>;
            const pAt = String(pmObj.purgedAt || '');
            if (pAt && pAt > lastPurgedAt) {
              lastPurgedAt = pAt;
            }
            send('member_mutation', {
              action: 'DELETED',
              memberId: pmObj.id,
              memberEmail: pmObj.email,
              timestamp: Date.now(),
              source: 'mongodb-purged-changedetect',
            });
          }

          // 5. In-App Notifications
          for (const n of newNotifs) {
            if (n.createdAt && n.createdAt > lastNotifAt) {
              lastNotifAt = n.createdAt;
            }
            send('notification_mutation', {
              action: 'CREATED',
              recipientEmail: n.recipientEmail,
              notificationId: n.id,
              notification: n,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          // 6. System Config
          if (changedConfig && changedConfig.config) {
            if (changedConfig.updatedAt && changedConfig.updatedAt > lastConfigUpdatedAt) {
              lastConfigUpdatedAt = changedConfig.updatedAt;
            }
            send('config_mutation', {
              config: changedConfig.config,
              updatedBy: changedConfig.updatedBy,
              updatedAt: changedConfig.updatedAt,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          // 7. Access Requests
          for (const ar of changedAccessReqs) {
            const arObj = ar as unknown as Record<string, unknown>;
            const aAt = String(arObj.updatedAt || '');
            if (aAt && aAt > lastAccessReqAt) {
              lastAccessReqAt = aAt;
            }
            send('access_request_mutation', {
              action: 'UPDATED',
              requestId: arObj.id,
              request: arObj,
              timestamp: Date.now(),
              source: 'mongodb-changedetect',
            });
          }

          if (!isAborted) {
            try {
              controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
            } catch {
              isAborted = true;
            }
          }
        } catch {
          if (!isAborted) {
            try {
              controller.enqueue(encoder.encode(`: poll-error ${Date.now()}\n\n`));
            } catch {
              isAborted = true;
            }
          }
        }
      }

      if (!isAborted) {
        cleanupListeners();
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
