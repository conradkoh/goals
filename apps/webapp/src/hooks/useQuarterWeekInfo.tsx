import { DateTime } from 'luxon';
import { useMemo } from 'react';

import { getQuarterFromWeek } from '@/lib/date/iso-week';

export interface WeekInfo {
  weekNumber: number;
  weekLabel: string;
  mondayDate: string;
  /** The ISO week year this week belongs to (may differ from calendar year at year boundaries) */
  weekYear: number;
  days: {
    dayOfWeek: number;
    date: string;
    dateTimestamp: number;
  }[];
}

interface QuarterWeekInfo {
  weeks: WeekInfo[];
  startWeek: number;
  endWeek: number;
  startDate: DateTime;
  endDate: DateTime;
  currentWeekNumber: number;
  /** Current ISO week year */
  currentWeekYear: number;
  isCurrentQuarter: boolean;
}

export const useQuarterWeekInfo = (year: number, quarter: 1 | 2 | 3 | 4): QuarterWeekInfo => {
  return useMemo(() => {
    // Calculate start and end dates for the quarter based on ISO week conventions
    // Quarters are defined by week ranges: Q1=1-13, Q2=14-26, Q3=27-39, Q4=40-52/53
    const startDate = DateTime.local(year, (quarter - 1) * 3 + 1, 1);
    const endDate = startDate.plus({ months: 3 }).minus({ days: 1 });

    // Get current date info using ISO week conventions
    const now = DateTime.now();
    const currentWeekNumber = now.weekNumber;
    const currentWeekYear = now.weekYear;
    const currentWeekQuarter = getQuarterFromWeek(currentWeekNumber);
    // Check if we're in the current quarter using ISO week year and week-based quarter
    const isCurrentQuarter = currentWeekYear === year && currentWeekQuarter === quarter;

    // Generate week information by iterating through weeks properly
    // This handles year boundaries correctly (e.g., Q4 ending in week 1 of next year)
    const weeks: WeekInfo[] = [];
    let currentDate = startDate.startOf('week');

    while (currentDate <= endDate) {
      // Get the Thursday of this week to determine the correct ISO week year
      const thursday = currentDate.plus({ days: 3 });
      const weekYear = thursday.year;
      const weekNumber = currentDate.weekNumber;

      weeks.push({
        weekNumber,
        weekYear,
        weekLabel: `Week ${weekNumber}`,
        mondayDate: currentDate.toFormat('LLL d'),
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i + 1,
          date: currentDate.plus({ days: i }).toFormat('LLL d'),
          dateTimestamp: currentDate.plus({ days: i }).toMillis(),
        })),
      });

      currentDate = currentDate.plus({ weeks: 1 });
    }

    // Calculate the proper start and end week numbers
    const startWeek = weeks.length > 0 ? weeks[0].weekNumber : 1;
    const endWeek = weeks.length > 0 ? weeks[weeks.length - 1].weekNumber : 1;

    return {
      weeks,
      startWeek,
      endWeek,
      startDate,
      endDate,
      currentWeekNumber,
      currentWeekYear,
      isCurrentQuarter,
    };
  }, [year, quarter]);
};
