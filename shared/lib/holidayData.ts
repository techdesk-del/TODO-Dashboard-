/**
 * lib/holidayData.ts — UrbanGaon Official Company Holidays (FY 2026-27)
 *
 * Prepared By: People Operations & Talent HR
 * Approved By: Mr. Sukh Sagar Singh (Founder / CEO)
 *
 * Enforces Flowchart 23 & Flowchart 13:
 * Automatically synchronizes with CalendarView and suppresses automated
 * email reminders & task forward actions on all official holidays & Sundays.
 */

export interface CompanyHoliday {
  sNo: number;
  date: string; // YYYY-MM-DD
  displayDate: string; // DD-Mon-YY
  name: string;
  days: number;
  description?: string;
  icon?: string;
}

export const OFFICIAL_HOLIDAYS_2026_27: CompanyHoliday[] = [
  {
    sNo: 1,
    date: '2026-08-15',
    displayDate: '15-Aug-26',
    name: 'Independence Day',
    days: 1,
    description: 'National Gazetted Holiday • Celebrating National Freedom',
    icon: ''
  },
  {
    sNo: 2,
    date: '2026-08-28',
    displayDate: '28-Aug-26',
    name: 'Raksha Bandhan',
    days: 1,
    description: 'Festival of Siblinghood & Protection',
    icon: ''
  },
  {
    sNo: 3,
    date: '2026-11-08',
    displayDate: '08-Nov-26',
    name: 'Diwali',
    days: 1,
    description: 'Festival of Lights & Prosperity',
    icon: ''
  },
  {
    sNo: 4,
    date: '2026-11-09',
    displayDate: '09-Nov-26',
    name: 'Govardhan Pooja',
    days: 1,
    description: 'Post-Diwali Govardhan Festivity',
    icon: ''
  },
  {
    sNo: 5,
    date: '2026-11-10',
    displayDate: '10-Nov-26',
    name: 'Bhai Dooj',
    days: 1,
    description: 'Bhai Dooj Celebrations',
    icon: ''
  },
  {
    sNo: 6,
    date: '2027-01-14',
    displayDate: '14-Jan-27',
    name: 'Makar Sankranti',
    days: 1,
    description: 'Harvest & Solar Transition Festival',
    icon: ''
  },
  {
    sNo: 7,
    date: '2027-01-26',
    displayDate: '26-Jan-27',
    name: 'Republic Day',
    days: 1,
    description: 'National Gazetted Holiday • Constitution of India',
    icon: ''
  },
  {
    sNo: 8,
    date: '2027-03-22',
    displayDate: '22-Mar-27',
    name: 'Holi',
    days: 1,
    description: 'Festival of Colors & Spring Renewal',
    icon: ''
  }
];

export const HOLIDAY_METADATA = {
  financialYear: '2026-27',
  totalHolidays: 8,
  preparedBy: 'People Operations & Talent HR',
  approvedBy: 'Mr. Sukh Sagar Singh (Founder / CEO)',
  policySummary: 'All automated morning reminder emails, task notifications, and SLA escalations are strictly paused on all gazetted company holidays and weekly off Sundays.'
};

/**
 * Checks if a given date string (YYYY-MM-DD) is an official UrbanGaon company holiday.
 */
export function getCompanyHoliday(dateStr: string): CompanyHoliday | undefined {
  if (!dateStr) return undefined;
  return OFFICIAL_HOLIDAYS_2026_27.find(h => h.date === dateStr);
}

/**
 * Returns the English name of the day of the week (e.g. 'Sunday', 'Monday') for a given YYYY-MM-DD.
 * Evaluated strictly at UTC noon to avoid any server-time / local-time zone offsets.
 */
export function getDayOfWeekName(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[dateObj.getUTCDay()];
}

/**
 * Checks if a given date string (YYYY-MM-DD) falls on a Sunday (Weekly Off).
 */
export function isSundayDate(dateStr: string): boolean {
  return getDayOfWeekName(dateStr) === 'Sunday';
}

/**
 * Comprehensive check for non-working days (Company Holiday, Sunday, or Unticked Weekday).
 * Strictly enforces real-time configuredWorkingDays schedule from System Configuration.
 */
export function isNonWorkingDay(dateStr: string, workingDays?: string[]): {
  isNonWorking: boolean;
  reason?: string;
  holiday?: CompanyHoliday;
  isSunday: boolean;
  dayName: string;
} {
  const holiday = getCompanyHoliday(dateStr);
  const isSunday = isSundayDate(dateStr);
  const dayName = getDayOfWeekName(dateStr);

  if (holiday) {
    return {
      isNonWorking: true,
      reason: `Company Holiday: ${holiday.name} (${holiday.displayDate})`,
      holiday,
      isSunday,
      dayName
    };
  }

  // If workingDays is configured, check if today's day of the week is ticked
  if (workingDays && Array.isArray(workingDays) && workingDays.length > 0) {
    const normalizedWorkingDays = workingDays.map(d => String(d).trim().toLowerCase());
    const isWorking = normalizedWorkingDays.includes(dayName.toLowerCase());

    if (!isWorking) {
      return {
        isNonWorking: true,
        reason: `${dayName} (Non-Working Day)`,
        isSunday,
        dayName
      };
    }
  } else if (isSunday) {
    return {
      isNonWorking: true,
      reason: 'Sunday (Weekly Off)',
      isSunday: true,
      dayName
    };
  }

  return {
    isNonWorking: false,
    isSunday: false,
    dayName
  };
}
