/**
 * lib/dateUtils.ts — Dynamic Local Date Helpers
 *
 * Automatically synchronizes calendar, task registers, and reminders
 * to the user's active current date and local timezone.
 */

export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (taskDateStr === today) {
      return `Today, ${timeStr}`;
    }
    if (taskDateStr === yesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const dateFormatted = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `${dateFormatted}, ${timeStr}`;
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

