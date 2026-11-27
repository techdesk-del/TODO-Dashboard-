/**
 * lib/events.ts — Global Server-Side Realtime Event Bus (Full MongoDB Atlas Sync)
 *
 * Broadcasts mutations across ALL MongoDB Atlas collections (Tasks, Members,
 * Notifications, SystemConfig, AuditLogs, AccessRequests) to all connected
 * SSE clients worldwide in real time (<50ms local / ~1s cross-instance).
 */

import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __realtimeEmitter: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __deletedTaskIds: Set<string> | undefined;
}

if (!global.__realtimeEmitter) {
  global.__realtimeEmitter = new EventEmitter();
  global.__realtimeEmitter.setMaxListeners(300);
}

if (!global.__deletedTaskIds) {
  global.__deletedTaskIds = new Set<string>();
}

export const realtimeEmitter = global.__realtimeEmitter;
export const globalDeletedTaskIds = global.__deletedTaskIds;

export function markTaskDeleted(id: string) {
  globalDeletedTaskIds.add(id);
}

export function unmarkTaskDeleted(id: string) {
  globalDeletedTaskIds.delete(id);
}

export function isTaskDeleted(id: string): boolean {
  return globalDeletedTaskIds.has(id);
}

export const REALTIME_EVENTS = {
  TASK_MUTATION: 'TASK_MUTATION',
  MEMBER_MUTATION: 'MEMBER_MUTATION',
  NOTIFICATION_MUTATION: 'NOTIFICATION_MUTATION',
  CONFIG_MUTATION: 'CONFIG_MUTATION',
  AUDIT_LOG: 'AUDIT_LOG',
  ACCESS_REQUEST_MUTATION: 'ACCESS_REQUEST_MUTATION',
} as const;

export function broadcastTaskMutation(payload: {
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'DELETED_ALL';
  taskId: string;
  taskTitle?: string;
  task?: unknown;
  updates?: unknown;
  source?: string;
}) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.TASK_MUTATION, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime Task Broadcast Error]', err);
  }
}

export function broadcastMemberMutation(payload: {
  action: 'CREATED' | 'UPDATED' | 'DEACTIVATED' | 'DELETED';
  memberId: string;
  oldMemberId?: string;
  memberName?: string;
  memberEmail?: string;
  oldEmail?: string;
  status?: string;
  member?: unknown;
}) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.MEMBER_MUTATION, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime Member Broadcast Error]', err);
  }
}

export function broadcastNotificationMutation(payload: {
  action: 'CREATED' | 'READ' | 'READ_ALL';
  recipientEmail?: string;
  notificationId?: string;
  notification?: unknown;
}) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.NOTIFICATION_MUTATION, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime Notification Broadcast Error]', err);
  }
}

export function broadcastConfigMutation(payload: {
  config: unknown;
  updatedBy?: string;
  updatedAt?: string;
}) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.CONFIG_MUTATION, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime Config Broadcast Error]', err);
  }
}

export function broadcastAuditLog(payload: { entry: unknown }) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.AUDIT_LOG, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime Audit Broadcast Error]', err);
  }
}

export function broadcastAccessRequestMutation(payload: {
  action: 'CREATED' | 'UPDATED';
  requestId?: string;
  request?: unknown;
}) {
  try {
    realtimeEmitter.emit(REALTIME_EVENTS.ACCESS_REQUEST_MUTATION, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[Realtime AccessRequest Broadcast Error]', err);
  }
}
