/**
 * backend/lib/changeStream.ts — Native MongoDB Atlas Change Streams Engine
 *
 * Watches the ENTIRE `urbangaon_todo` MongoDB Atlas database in real time using
 * native replica-set Change Streams (`db.watch([], { fullDocument: 'updateLookup' })`).
 *
 * Why this matters:
 *  - Direct edits, inserts, or deletes made inside MongoDB Compass (which do NOT
 *    modify `updatedAt`) are detected instantaneously (<50ms) and pushed to every
 *    connected browser over `/api/realtime` SSE.
 *  - Gracefully auto-reconnects on network hiccups and safely no-ops on non-replica-set
 *    standalone local MongoDB instances.
 */

import type { Connection } from 'mongoose';
import {
  broadcastTaskMutation,
  broadcastMemberMutation,
  broadcastNotificationMutation,
  broadcastConfigMutation,
  broadcastAuditLog,
  broadcastAccessRequestMutation,
} from '@/lib/events';

declare global {
  // eslint-disable-next-line no-var
  var __mongoChangeStreamActive: boolean | undefined;
}

export function initMongoChangeStream(conn: Connection): void {
  if (typeof window !== 'undefined') return;
  if (global.__mongoChangeStreamActive) return;

  const db = conn.db;
  if (!db) return;

  global.__mongoChangeStreamActive = true;

  const startWatch = (retryMs = 2000) => {
    try {
      const changeStream = db.watch([], { fullDocument: 'updateLookup' });
      console.log('[DB ChangeStream] ✓ Watching entire MongoDB Atlas database in real time');

      changeStream.on('change', (change: any) => {
        try {
          const coll = String(change?.ns?.coll || '').toLowerCase();
          const op = String(change?.operationType || '');
          const doc = change?.fullDocument || null;

          if (coll === 'tasks') {
            if (op === 'delete') {
              broadcastTaskMutation({
                action: 'UPDATED',
                taskId: 'all',
                source: 'mongodb-changestream-delete',
              });
            } else if (doc && doc.id) {
              broadcastTaskMutation({
                action: op === 'insert' ? 'CREATED' : 'UPDATED',
                taskId: doc.id,
                taskTitle: doc.title,
                task: doc,
                updates: doc,
                source: 'mongodb-changestream',
              });
            }
          } else if (coll === 'members') {
            if (op === 'delete') {
              broadcastMemberMutation({
                action: 'UPDATED',
                memberId: 'all',
              });
            } else if (doc && doc.id) {
              broadcastMemberMutation({
                action:
                  op === 'insert'
                    ? 'CREATED'
                    : doc.status === 'DEACTIVATED'
                    ? 'DEACTIVATED'
                    : 'UPDATED',
                memberId: doc.id,
                memberName: doc.name,
                memberEmail: doc.email,
                status: doc.status,
                member: doc,
              });
            }
          } else if (coll === 'purged_members' && doc) {
            broadcastMemberMutation({
              action: 'DELETED',
              memberId: doc.id || '',
              memberEmail: doc.email || '',
            });
          } else if (coll === 'notifications' && doc) {
            broadcastNotificationMutation({
              action: op === 'insert' ? 'CREATED' : 'READ',
              recipientEmail: doc.recipientEmail,
              notificationId: doc.id,
              notification: doc,
            });
          } else if (coll === 'systemconfigs' && doc?.config) {
            broadcastConfigMutation({
              config: doc.config,
              updatedBy: doc.updatedBy,
              updatedAt: doc.updatedAt,
            });
          } else if ((coll === 'audit_logs' || coll === 'auditlogs') && doc) {
            broadcastAuditLog({ entry: doc });
          } else if (coll === 'accessrequests' && doc) {
            broadcastAccessRequestMutation({
              action: op === 'insert' ? 'CREATED' : 'UPDATED',
              requestId: doc.id,
              request: doc,
            });
          }
        } catch (err) {
          console.warn('[DB ChangeStream] Event dispatch warning:', err);
        }
      });

      changeStream.on('error', (err: any) => {
        const msg = String(err?.message || err);
        // Standalone MongoDB without replica set doesn't support Change Streams
        if (msg.includes('only supported on replica sets') || err?.code === 40573) {
          console.warn('[DB ChangeStream] Standalone MongoDB detected; falling back to 1s poll.');
          global.__mongoChangeStreamActive = false;
          return;
        }
        console.warn('[DB ChangeStream] Stream error, reconnecting...', msg);
        try {
          changeStream.close().catch(() => {});
        } catch {}
        setTimeout(() => startWatch(Math.min(retryMs * 2, 15000)), retryMs);
      });

      changeStream.on('close', () => {
        if (global.__mongoChangeStreamActive) {
          setTimeout(() => startWatch(2000), 2000);
        }
      });
    } catch (err) {
      console.warn('[DB ChangeStream] Failed to start, retrying...', err);
      setTimeout(() => startWatch(Math.min(retryMs * 2, 15000)), retryMs);
    }
  };

  startWatch();
}
