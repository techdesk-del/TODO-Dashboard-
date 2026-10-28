/**
 * hooks/useTaskDeadlines.ts — Browser Push & Sound Notification Monitor
 *
 * Scans user's active tasks every 60 seconds.
 * If a task deadline is approaching (< 15 minutes) or overdue, fires:
 * 1. Native Desktop Web Notification (if permission granted)
 * 2. Enterprise acoustic chime via soundEngine
 * 3. App banner notification
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { soundEngine } from '@/lib/sound';
import { getTodayStr } from '@/lib/dateUtils';
import { isCeoUser, isStrictCeo } from '@/lib/rosterData';
import { Task } from '@/types';

export function useTaskDeadlines() {
  const { tasks, currentUser, setBannerNotification } = useApp();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const initialOverdueNotifiedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          soundEngine.playSuccessChime();
          new Notification('UrbanGaon Notifications Enabled', {
            body: 'You will receive timely desktop alerts for upcoming deadlines and overdue pending deliverables.',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  }, []);

  const isCeo = isCeoUser(currentUser);
  const todayStr = getTodayStr();

  // Find user's active (uncompleted) deliverables
  const activeUserTasks = useMemo(() => {
    const isStrictCeoAccount = isStrictCeo(currentUser);
    return tasks.filter(t => {
      if (t.status === 'Done' || t.status === 'Cancelled') return false;
      if (isStrictCeoAccount) return true;
      const cleanEmail = (currentUser.email || '').toLowerCase().trim();
      const cleanName = (currentUser.name || '').toLowerCase().trim();
      const isAssignee = t.assignees?.some(a =>
        a.id === currentUser.id ||
        (a.email && a.email.toLowerCase().trim() === cleanEmail) ||
        (a.name && cleanName && a.name.toLowerCase().trim() === cleanName)
      );
      return Boolean(isAssignee);
    });
  }, [tasks, currentUser]);

  // Overdue Deliverables: Scheduled on previous date OR scheduled today with time past
  const overdueTasks = useMemo(() => {
    return activeUserTasks.filter(t => {
      if (t.scheduledDate < todayStr) return true;
      if (t.scheduledDate === todayStr) {
        const [timePart, meridiem] = t.time.split(' ');
        if (!timePart || !meridiem) return false;
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        const scheduledTime = new Date(`${t.scheduledDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
        return scheduledTime.getTime() < Date.now();
      }
      return false;
    });
  }, [activeUserTasks, todayStr]);

  // Due Soon Deliverables: Scheduled today and due within 30 minutes
  const dueSoonTasks = useMemo(() => {
    return activeUserTasks.filter(t => {
      if (t.scheduledDate !== todayStr) return false;
      const [timePart, meridiem] = t.time.split(' ');
      if (!timePart || !meridiem) return false;
      let [hours, minutes] = timePart.split(':').map(Number);
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      const scheduledTime = new Date(`${t.scheduledDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const diffMinutes = (scheduledTime.getTime() - Date.now()) / (1000 * 60);
      return diffMinutes > 0 && diffMinutes <= 30;
    });
  }, [activeUserTasks, todayStr]);

  // Notification and deadline alert scanner
  useEffect(() => {
    const checkDeadlinesAndNotify = () => {
      // 1. Initial / Periodic Overdue Alert
      if (overdueTasks.length > 0 && !initialOverdueNotifiedRef.current) {
        initialOverdueNotifiedRef.current = true;

        // Play chime alert
        try {
          soundEngine.playUrgentDeadlineChime();
        } catch {}

        // Desktop Web Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`UrbanGaon: ${overdueTasks.length} Pending Deliverable(s) Overdue`, {
            body: `You have ${overdueTasks.length} pending task(s) from previous dates awaiting completion or rescheduling.`,
            icon: '/favicon.ico',
          });
        }

        // Top Banner Notification
        setBannerNotification({
          message: `Attention Required: ${overdueTasks.length} pending deliverable(s) are overdue from previous dates (e.g. ${overdueTasks[0]?.scheduledDate})`,
          badge: 'Action Required'
        });
      }

      // 2. Individual Due-Soon Task alerts
      dueSoonTasks.forEach(task => {
        if (notifiedTasksRef.current.has(task.id)) return;
        notifiedTasksRef.current.add(task.id);

        try {
          soundEngine.playUrgentDeadlineChime();
        } catch {}

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Task Due Soon: ${task.title}`, {
            body: `Target time is ${task.time} (${task.priority} Priority). Click to review deliverable.`,
            icon: '/favicon.ico',
          });
        }

        setBannerNotification({
          message: `Task Due Soon: '${task.title}' at ${task.time} today (${task.priority})`,
          badge: 'Upcoming Due'
        });
      });
    };

    checkDeadlinesAndNotify();
    const interval = setInterval(checkDeadlinesAndNotify, 30000);
    return () => clearInterval(interval);
  }, [overdueTasks, dueSoonTasks, setBannerNotification]);

  return {
    notificationPermission,
    requestPermission,
    overdueTasks,
    dueSoonTasks,
    pendingCount: overdueTasks.length,
  };
}
