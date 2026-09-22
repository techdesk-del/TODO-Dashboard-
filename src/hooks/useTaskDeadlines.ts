/**
 * hooks/useTaskDeadlines.ts — Browser Push & Sound Notification Monitor
 *
 * Scans user's active tasks every 60 seconds.
 * If a task deadline is approaching (< 15 minutes) or overdue, fires:
 * 1. Native Desktop Web Notification (if permission granted)
 * 2. Enterprise acoustic chime via soundEngine
 * 3. App banner notification
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { soundEngine } from '@/lib/sound';

export function useTaskDeadlines() {
  const { tasks, currentUser, setBannerNotification } = useApp();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const notifiedTasksRef = useRef<Set<string>>(new Set());

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
            body: 'You will receive timely desktop alerts 15 minutes before task deadlines.',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  }, []);

  // Periodic deadline scanner
  useEffect(() => {
    const checkDeadlines = () => {
      // Find today's uncompleted tasks for current user
      const myTasks = tasks.filter(t =>
        t.status !== 'Done' &&
        t.status !== 'Cancelled' &&
        t.assignees.some(a => a.id === currentUser.id || a.name.toLowerCase().includes(currentUser.name.toLowerCase()))
      );

      myTasks.forEach(task => {
        // Skip if already notified in this browser session
        if (notifiedTasksRef.current.has(task.id)) return;

        // Compare time (e.g. "05:00 PM" on "2026-09-15")
        const [timePart, meridiem] = task.time.split(' ');
        if (!timePart || !meridiem) return;

        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const scheduledTime = new Date(`${task.scheduledDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
        const diffMinutes = (scheduledTime.getTime() - Date.now()) / (1000 * 60);

        // If due within 15 minutes or overdue
        if (diffMinutes <= 15 && diffMinutes >= -120) {
          notifiedTasksRef.current.add(task.id);

          // 1. Play sound chime
          soundEngine.playUrgentDeadlineChime();

          // 2. Trigger browser notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ Task Due Soon: ${task.title}`, {
              body: `Target time is ${task.time} (${task.priority} Priority). Click to review deliverable.`,
              icon: '/favicon.ico',
            });
          }

          // 3. Set top banner alert
          setBannerNotification({
            message: `⚠️ Task Due: '${task.title}' at ${task.time} today (${task.priority})`,
            badge: '⏰ Action Required'
          });
        }
      });
    };

    // Run initial check and set 60s interval
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [tasks, currentUser, setBannerNotification]);

  return {
    notificationPermission,
    requestPermission,
  };
}
