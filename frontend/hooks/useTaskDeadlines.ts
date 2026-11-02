/**
 * hooks/useTaskDeadlines.ts — Browser Push & Sound Notification Monitor
 *
 * Scans user's active tasks every 30 seconds.
 * Strictly guarantees that any completed tasks (overall status 'Done', multi-assignee 'Done',
 * or individual assignee status 'Done' for current user) are NEVER flagged as overdue or pending.
 *
 * If a task deadline is approaching (< 30 minutes) or overdue, fires:
 * 1. Native Desktop Web Notification (if permission granted)
 * 2. Enterprise acoustic chime via soundEngine
 * 3. App banner notification
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { soundEngine } from '@/frontend/lib/sound';
import { getTodayStr } from '@/shared/lib/dateUtils';
import { isCeoUser, isStrictCeo } from '@/shared/lib/rosterData';
import { computeMultiAssigneeStatus } from '@/shared/lib/multiAssignee';
import { Task, TeamMember } from '@/types';

/**
 * Checks whether a task is universally completed or cancelled.
 */
export function isTaskDone(task: Task): boolean {
  if (!task) return false;
  const statusStr = String(task.status || '').trim().toLowerCase();
  if (statusStr === 'done' || statusStr === 'completed' || statusStr === 'cancelled') {
    return true;
  }
  const comp = computeMultiAssigneeStatus(task);
  if (comp.status === 'Done' || comp.status === 'Cancelled') {
    return true;
  }
  return false;
}

/**
 * Checks whether a task is considered completed for the specific active user.
 */
export function isTaskDoneForUser(task: Task, currentUser?: TeamMember | null): boolean {
  if (!task || !currentUser) return false;
  if (isTaskDone(task)) return true;

  // Strict CEO account (Mr. Sukh Sagar Singh Bhati) monitors all enterprise tasks
  if (isStrictCeo(currentUser)) {
    return isTaskDone(task);
  }

  const cleanEmail = (currentUser.email || '').toLowerCase().trim();
  const cleanName = (currentUser.name || '').toLowerCase().trim();
  const userId = currentUser.id || '';

  // Check if current user is an assignee
  const userAssignee = task.assignees?.find(a =>
    (userId && a.id === userId) ||
    (a.email && cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
    (a.name && cleanName && a.name.toLowerCase().trim() === cleanName)
  );

  // If user is an assignee and has marked their individual component Done or Cancelled
  if (userAssignee) {
    const aStat = String(userAssignee.status || '').trim().toLowerCase();
    if (aStat === 'done' || aStat === 'completed' || aStat === 'cancelled') {
      return true;
    }
  }

  // If deliverable is in Review / submitted awaiting CEO approval
  if (task.status === 'Review' || (task as any).pendingCeoApproval) {
    // Regular employees have submitted their work; it is awaiting CEO, not an overdue pending action for the employee
    if (!isCeoUser(currentUser)) {
      return true;
    }
  }

  return false;
}

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

  const todayStr = getTodayStr();

  // Find user's active (uncompleted) deliverables
  const activeUserTasks = useMemo(() => {
    const isStrictCeoAccount = isStrictCeo(currentUser);
    return tasks.filter(t => {
      // 1. Exclude any task that is completed or cancelled (overall or for current user)
      if (isTaskDone(t) || isTaskDoneForUser(t, currentUser)) {
        return false;
      }

      // 2. Strict CEO account monitors all active tasks
      if (isStrictCeoAccount) return true;

      // 3. For all other users (including Aakash / Admins / Employees), check assignment
      const cleanEmail = (currentUser.email || '').toLowerCase().trim();
      const cleanName = (currentUser.name || '').toLowerCase().trim();
      const userId = currentUser.id || '';

      const isAssignee = t.assignees?.some(a =>
        (userId && a.id === userId) ||
        (a.email && cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (a.name && cleanName && a.name.toLowerCase().trim() === cleanName)
      );

      // If user is an assignee and has NOT completed their part
      return Boolean(isAssignee);
    });
  }, [tasks, currentUser]);

  // Overdue Deliverables: Effective deadline is past date OR today with time past
  const overdueTasks = useMemo(() => {
    return activeUserTasks.filter(t => {
      // Per Flowchart 21: effective deadline is dueDate if provided, else scheduledDate
      const effectiveDl = (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;
      if (!effectiveDl) return false;

      // Scheduled on previous date
      if (effectiveDl < todayStr) return true;

      // Scheduled today with scheduled time past
      if (effectiveDl === todayStr) {
        if (!t.time) return false;
        const [timePart, meridiem] = t.time.split(' ');
        if (!timePart || !meridiem) return false;
        let [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        const scheduledTime = new Date(`${effectiveDl}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
        return scheduledTime.getTime() < Date.now();
      }

      // Future date: not overdue
      return false;
    });
  }, [activeUserTasks, todayStr]);

  // Due Soon Deliverables: Scheduled today and due within 30 minutes
  const dueSoonTasks = useMemo(() => {
    return activeUserTasks.filter(t => {
      const effectiveDl = (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;
      if (effectiveDl !== todayStr || !t.time) return false;
      const [timePart, meridiem] = t.time.split(' ');
      if (!timePart || !meridiem) return false;
      let [hours, minutes] = timePart.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return false;
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      const scheduledTime = new Date(`${effectiveDl}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const diffMinutes = (scheduledTime.getTime() - Date.now()) / (1000 * 60);
      return diffMinutes > 0 && diffMinutes <= 30;
    });
  }, [activeUserTasks, todayStr]);

  // Reset notification tracking when overdue tasks clear
  useEffect(() => {
    if (overdueTasks.length === 0) {
      initialOverdueNotifiedRef.current = false;
    }
  }, [overdueTasks.length]);

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
            body: `You have ${overdueTasks.length} pending task(s) awaiting completion or rescheduling.`,
            icon: '/favicon.ico',
          });
        }

        // Top Banner Notification
        setBannerNotification({
          message: `Attention Required: ${overdueTasks.length} pending deliverable(s) are overdue (e.g. ${overdueTasks[0]?.title})`,
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
