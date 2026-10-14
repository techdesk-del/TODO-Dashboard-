/**
 * lib/holidayData.ts — UrbanGaon Official Company Holidays (FY 2026-27)
 *
 * Prepared By: Varun Mudgal (Manager - Talent)
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
    icon: '🇮🇳'
  },
  {
    sNo: 2,
    date: '2026-08-28',
    displayDate: '28-Aug-26',
    name: 'Raksha Bandhan',
    days: 1,
    description: 'Festival of Siblinghood & Protection',
    icon: '✨'
  },
  {
    sNo: 3,
    date: '2026-11-08',
    displayDate: '08-Nov-26',
    name: 'Diwali',
    days: 1,
    description: 'Festival of Lights & Prosperity',
    icon: '🪔'
  },
  {
    sNo: 4,
    date: '2026-11-09',
    displayDate: '09-Nov-26',
    name: 'Govardhan Pooja',
    days: 1,
    description: 'Post-Diwali Govardhan Festivity',
    icon: '🕉️'
  },
  {
    sNo: 5,
    date: '2026-11-10',
    displayDate: '10-Nov-26',
    name: 'Bhai Dooj',
    days: 1,
    description: 'Bhai Dooj Celebrations',
    icon: '🌟'
  },
  {
    sNo: 6,
    date: '2027-01-14',
    displayDate: '14-Jan-27',
    name: 'Makar Sankranti',
    days: 1,
    description: 'Harvest & Solar Transition Festival',
    icon: '🪁'
  },
  {
    sNo: 7,
    date: '2027-01-26',
    displayDate: '26-Jan-27',
    name: 'Republic Day',
    days: 1,
    description: 'National Gazetted Holiday • Constitution of India',
    icon: '🇮🇳'
  },
  {
    sNo: 8,
    date: '2027-03-22',
    displayDate: '22-Mar-27',
    name: 'Holi',
    days: 1,
    description: 'Festival of Colors & Spring Renewal',
    icon: '🎨'
  }
];

export const HOLIDAY_METADATA = {
  financialYear: '2026-27',
  totalHolidays: 8,
  preparedBy: 'Varun Mudgal (Manager - Talent)',
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
 * Checks if a given date string (YYYY-MM-DD) falls on a Sunday (Weekly Off).
 */
export function isSundayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.getDay() === 0;
}

/**
 * Comprehensive check for non-working days (Company Holiday or Sunday).
 * Returns suppression rationale for email dispatcher and cron daemon.
 */
export function isNonWorkingDay(dateStr: string): {
  isNonWorking: boolean;
  reason?: string;
  holiday?: CompanyHoliday;
  isSunday: boolean;
} {
  const holiday = getCompanyHoliday(dateStr);
  const isSunday = isSundayDate(dateStr);

  if (holiday) {
    return {
      isNonWorking: true,
      reason: `Company Holiday: ${holiday.name} (${holiday.displayDate})`,
      holiday,
      isSunday
    };
  }

  if (isSunday) {
    return {
      isNonWorking: true,
      reason: 'Sunday (Weekly Off)',
      isSunday: true
    };
  }

  return {
    isNonWorking: false,
    isSunday: false
  };
}
