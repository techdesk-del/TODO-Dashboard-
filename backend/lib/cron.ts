
/**
 * Parses user-configured schedule time (e.g. "05:11 P.M", "08:30 AM", "17:11") into 24-hr IST hours & minutes.
 */
export function parseScheduleTimeToIst(timeStr?: string): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 8, minute: 30 };
  }
  const clean = timeStr.trim().toUpperCase().replace(/\./g, '');
  const isPm = clean.includes('PM');
  const isAm = clean.includes('AM');
  const digits = clean.replace(/[^0-9:]/g, '');
  const parts = digits.split(':').map(Number);
  let hour = parts[0] || 8;
  const minute = parts[1] !== undefined ? parts[1] : 30;

  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  return { hour, minute };
}

/**
 * lib/cron.ts — Automated Server-Side Background Schedulers
 *
 * Runs:
 * 1. 08:30 AM IST Daily: Dispatches targeted Morning Digests to all staff (Flowchart 13).
 * 2. 00:05 AM IST Nightly: Executes 100% automated Carry-Forward Rollover engine (Flowchart 11).
 * 3. Hourly IST: Overdue & No-Reason Auto-Flag Routine (Flowchart 21).
 * 4. 02:00 AM IST Daily: Data Retention & Archive Engine (Flowchart 25 & 27).
 */

import cron from 'node-cron';
import connectDB from './db';
import { TaskModel } from '@/models/Task';
import { AuditLogModel } from '@/models/AuditLog';
import { SystemConfigModel } from '@/models/SystemConfig';
import { isNonWorkingDay } from '@/shared/lib/holidayData';
import { getTodayStr } from '@/shared/lib/dateUtils';
import { runOverdueAndNoReasonEvaluation } from './overdueEngine';
import { executeDataRetention } from './retentionEngine';
import { runMorningDigest } from './digestEngine';
import type { Role } from '@/types';

interface CronCache {
  isInitialized: boolean;
  lastDigestDate: string | null;
  lastRolloverDate: string | null;
  lastOverdueHour: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __cronCache: CronCache | undefined;
}

const cache: CronCache = global.__cronCache ?? { 
  isInitialized: false,
  lastDigestDate: null,
  lastRolloverDate: null,
  lastOverdueHour: null,
};
global.__cronCache = cache;

export interface RolloverOptions {
  forceShiftTodayToTomorrow?: boolean;
  actor?: string;
  actorRole?: Role;
}

export interface RolloverResult {
  success: boolean;
  rolledOverCount: number;
  message: string;
  targetDate: string;
}

/**
 * Executes 100% automated Carry-Forward Rollover Protocol.
 * 
 * Standard midnight mode: Any uncompleted deliverable scheduled prior to today (< today)
 * is automatically rolled over to TODAY, preserving carryForwardCount.
 * 
 * Manual simulation mode: If forceShiftTodayToTomorrow=true, uncompleted deliverables
 * scheduled for today are rolled forward to TOMORROW.
 */
export async function executeNightlyRollover(options: RolloverOptions = {}): Promise<RolloverResult> {
  await connectDB();
  const today = getTodayStr();

  let targetDate = today;
  let query: Record<string, any> = {
    scheduledDate: { $lt: today },
    status: { $nin: ['Done', 'Cancelled'] }
  };

  // If manual simulation requested to shift today's tasks to tomorrow
  if (options.forceShiftTodayToTomorrow) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    targetDate = d.toISOString().split('T')[0];
    query = {
      scheduledDate: { $lte: today },
      status: { $nin: ['Done', 'Cancelled'] }
    };
  }

  const result = await TaskModel.updateMany(
    query,
    {
      $set: { scheduledDate: targetDate },
      $inc: { carryForwardCount: 1 }
    }
  );

  const rolledCount = result.modifiedCount;
  const message = options.forceShiftTodayToTomorrow
    ? `Rolled over ${rolledCount} uncompleted task(s) to tomorrow (${targetDate}) with carry-forward increment`
    : `Rolled over ${rolledCount} past-due task(s) to today (${targetDate}) with carry-forward increment`;

  await AuditLogModel.create({
    id: `audit-rollover-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: options.actor || 'Automated 00:05 AM Rollover Cron',
    actorRole: options.actorRole || 'SUPER_ADMIN',
    action: 'CARRIED_FORWARD',
    fieldChanged: 'Nightly Uncompleted Tasks Rollover Engine',
    oldValue: `Uncompleted commitments prior to ${targetDate}`,
    newValue: message,
    ipAddress: '127.0.0.1',
    deviceInfo: 'MongoDB Nightly Rollover Worker',
    notes: 'Preserved 100% commitment integrity with zero data loss',
  }).catch(() => {});

  console.log(`[Rollover Engine] ✓ ${message}`);
  return {
    success: true,
    rolledOverCount: rolledCount,
    message,
    targetDate
  };
}

/**
 * Initializes server background schedulers with Asia/Kolkata (IST) timezone.
 */
export function initServerCron() {
  if (cache.isInitialized) {
    return;
  }
  cache.isInitialized = true;

  console.log('[Cron] Initializing UrbanGaon Enterprise Server Background Schedulers (Timezone: Asia/Kolkata)...');

  // 1. Morning Digest Dispatch at 08:30 AM IST every day (Flowchart 13)
  cron.schedule('30 8 * * *', async () => {
    try {
      console.log('[Cron 08:30 AM IST] Executing automated morning email digest...');
      const result = await runMorningDigest({ force: false, actor: 'Automated 08:30 AM Cron' });
      cache.lastDigestDate = getTodayStr();
      console.log(`[Cron 08:30 AM IST] Result: ${result.message}`);
    } catch (err) {
      console.error('[Cron 08:30 AM IST Error]', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 2. Nightly Carry-Forward at 00:05 AM IST every day (Flowchart 11)
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('[Cron 00:05 AM IST] Executing automated carry-forward rollover...');
      const result = await executeNightlyRollover({ actor: 'Automated 00:05 AM Cron' });
      cache.lastRolloverDate = getTodayStr();
      console.log(`[Cron 00:05 AM IST] Result: ${result.message}`);
    } catch (err) {
      console.error('[Cron 00:05 AM IST Error]', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 3. Hourly Overdue & No-Reason Auto-Flag Routine (Flowchart 21)
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const currentHourKey = `${getTodayStr()}-H${new Date(istString).getHours()}`;

      if (cache.lastOverdueHour === currentHourKey) {
        console.log(`[Cron Hourly IST] Already evaluated for hour ${currentHourKey}, skipping duplicate run.`);
        return;
      }
      cache.lastOverdueHour = currentHourKey;

      console.log(`[Cron Hourly IST] Running automated overdue & no-reason evaluation (${currentHourKey})...`);
      await runOverdueAndNoReasonEvaluation({
        thresholdDays: 3,
        sendNotifications: true,
      });
    } catch (err) {
      console.error('[Cron Hourly Error - Overdue Engine]', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 4. Daily Data Retention and Archive Engine at 02:00 AM IST
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Cron 02:00 AM IST] Executing Automated Data Retention & Archive Engine...');
      await executeDataRetention({
        taskRetentionDays: 365,
        auditRetentionDays: 730,
        actor: 'Daily Retention Automated Cron',
        actorRole: 'SUPER_ADMIN'
      });
    } catch (err) {
      console.error('[Cron 02:00 AM Error - Retention Engine]', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 5. 60-second Real-Time Heartbeat Fallback (Guarantees execution even if node-cron clock drifts)
  setInterval(async () => {
    try {
      const now = new Date();
      const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istString);
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const todayStr = getTodayStr();

      // Fetch dynamic email schedule time & working days from MongoDB in real time
      let cfgDoc: any = null;
      try {
        cfgDoc = await SystemConfigModel.findOne({ key: 'global_system_config' }).lean();
      } catch (err) {
        console.warn('[Cron Heartbeat] Failed to fetch system config:', err);
      }

      const configuredTime = cfgDoc?.config?.emailScheduleTime || '08:30 AM';
      const configuredWorkingDays = cfgDoc?.config?.workingDays;
      const { hour: targetHour, minute: targetMinute } = parseScheduleTimeToIst(configuredTime);

      // Check configured daily dispatch time in Asia/Kolkata (IST)
      if (hours === targetHour && minutes === targetMinute && cache.lastDigestDate !== todayStr) {
        cache.lastDigestDate = todayStr;
        const nonWorking = isNonWorkingDay(todayStr, configuredWorkingDays);

        if (nonWorking.isNonWorking) {
          console.log(`[Heartbeat Cron] Daily digest suppressed at ${configuredTime} IST: Today is ${nonWorking.reason}`);
          await AuditLogModel.create({
            id: `audit-email-skip-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: 'Automated Real-Time Digest Daemon',
            actorRole: 'SUPER_ADMIN',
            action: 'CONFIG_CHANGED',
            fieldChanged: 'Daily Digest Suppressed (Non-Working Day)',
            oldValue: 'Scheduled Email Dispatch',
            newValue: `Auto-Suppressed: ${nonWorking.reason}`,
            ipAddress: '127.0.0.1',
            deviceInfo: 'Real-Time Schedule Daemon',
            notes: `Zero emails dispatched to staff. Today is ${nonWorking.reason}. Unticked in Email Schedule Settings.`,
          }).catch(() => {});
        } else {
          console.log(`[Heartbeat Cron] Firing automated daily digest at configured time (${configuredTime} IST)...`);
          await runMorningDigest({ force: false, actor: `Automated Scheduled Cron (${configuredTime})` });
        }
      }

      // Check 00:05 AM IST for Midnight Rollover
      if (hours === 0 && minutes === 5 && cache.lastRolloverDate !== todayStr) {
        cache.lastRolloverDate = todayStr;
        console.log('[Heartbeat 00:05 AM IST] Firing automated midnight rollover...');
        await executeNightlyRollover({ actor: 'Heartbeat 00:05 AM Daemon' });
      }
    } catch (heartbeatErr) {
      console.error('[Cron Heartbeat Error]', heartbeatErr);
    }
  }, 60000);

  console.log('[Cron] ✓ Automated Enterprise Engines active: 08:30 AM IST (Morning Digest) & 00:05 AM IST (Midnight Rollover)');
}
