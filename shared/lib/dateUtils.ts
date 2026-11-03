/**
 * lib/dateUtils.ts — Dynamic Local Date Helpers
 *
 * Automatically synchronizes calendar, task registers, and reminders
 * to the user's active current date and local timezone.
 */

export const getTodayStr = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

export const getTomorrowStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
};

export const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
};

export const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const dateObj = new Date(y, m - 1, d);
  const today = getTodayStr();

  const formatted = dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (dateStr === today) {
    return `Today (${formatted})`;
  }
  return formatted;
};

export const formatDateTitle = (dateStr?: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const dateObj = new Date(y, m - 1, d);
  const today = getTodayStr();

  const formatted = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (dateStr === today) {
    return `Today (${formatted})`;
  }
  return formatted;
};

export const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const dateObj = new Date(y, m - 1, d);
  const today = getTodayStr();

  const formatted = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });

  if (dateStr === today) {
    return `Today, ${formatted}`;
  }
  return formatted;
};

export const formatDateDayMonth = (dateStr?: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Formats task creation date into clean, human-readable corporate format.
 */
export const formatCreationDate = (createdAt?: string): string => {
  if (!createdAt) return 'Initial Roster';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
        return formatDateDayMonth(createdAt);
      }
      return createdAt;
    }

    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    const taskDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (taskDateStr === today) {
      return 'Today';
    }
    if (taskDateStr === yesterday) {
      return 'Yesterday';
    }

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return createdAt || 'Initial';
  }
};

/**
 * Formats due date with contextual status (Overdue, Due Today, Tomorrow, Future Date).
 */
export const formatDueDate = (scheduledDate?: string, time?: string, dueDate?: string): {
  formatted: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
} => {
  const targetDate = dueDate || scheduledDate;
  if (!targetDate) {
    return { formatted: time || 'No deadline', isOverdue: false, isToday: false, isTomorrow: false };
  }

  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  const isOverdue = targetDate < today;
  const isToday = targetDate === today;
  const isTomorrow = targetDate === tomorrow;

  const [y, m, d] = targetDate.split('-').map(Number);
  let dateText = targetDate;
  if (y && m && d) {
    const dateObj = new Date(y, m - 1, d);
    dateText = dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  let prefix = '';
  if (isToday) prefix = 'Today';
  else if (isTomorrow) prefix = 'Tomorrow';
  else if (isOverdue) prefix = `${dateText} (Overdue)`;
  else prefix = dateText;

  const timeSuffix = time ? ` • ${time}` : '';
  const formatted = (isToday || isTomorrow) ? `${prefix} (${dateText})${timeSuffix}` : `${prefix}${timeSuffix}`;

  return {
    formatted,
    isOverdue,
    isToday,
    isTomorrow
  };
};

/**
 * Determines whether a deliverable belongs to a given target date (YYYY-MM-DD).
 * Matches across:
 * 1. scheduledDate (currently scheduled date)
 * 2. dueDate (target deadline / commitment date)
 * 3. createdAt (date the deliverable was created / set)
 */
export const isTaskForDate = (
  task?: { scheduledDate?: string; dueDate?: string; createdAt?: string } | null,
  targetDate?: string | null
): boolean => {
  if (!task || !targetDate) return false;
  const target = targetDate.trim();
  if (!target) return false;

  if (task.scheduledDate && task.scheduledDate.trim() === target) return true;
  if (task.dueDate && task.dueDate.trim() === target) return true;
  if (task.createdAt && task.createdAt.slice(0, 10) === target) return true;

  return false;
};

/**
 * Returns all distinct calendar dates (YYYY-MM-DD) associated with a deliverable
 * (scheduled date, due date, creation date).
 */
export const getTaskDates = (
  task?: { scheduledDate?: string; dueDate?: string; createdAt?: string } | null
): string[] => {
  if (!task) return [];
  const set = new Set<string>();
  if (task.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(task.scheduledDate.trim())) {
    set.add(task.scheduledDate.trim());
  }
  if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate.trim())) {
    set.add(task.dueDate.trim());
  }
  if (task.createdAt) {
    const createdDate = task.createdAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
      set.add(createdDate);
    }
  }
  return Array.from(set);
};


