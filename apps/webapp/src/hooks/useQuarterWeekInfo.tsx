import { DateTime } from 'luxon';
import { useMemo } from 'react';

export interface WeekInfo {
  weekNumber: number;
  weekLabel: string;
  mondayDate: string;
  days: Array<{
    dayOfWeek: number;
    date: string;
    dateTimestamp: number;
  }>;
}

interface QuarterWeekInfo {
  weeks: WeekInfo[];
  startWeek: number;
  endWeek: number;
  startDate: DateTime;
  endDate: DateTime;
  currentWeekNumber: number;
  isCurrentQuarter: boolean;
}

export const useQuarterWeekInfo = (year: number, quarter: 1 | 2 | 3 | 4): QuarterWeekInfo => {
  return useMemo(() => {
    // Calculate start and end dates for the quarter
    const startDate = DateTime.local(year, (quarter - 1) * 3 + 1, 1);
    const endDate = startDate.plus({ months: 3 }).minus({ days: 1 });
    const startWeek = startDate.weekNumber;
    const endWeek = endDate.weekNumber;

    // Get current date info
    const now = DateTime.now();
    const currentWeekNumber = now.weekNumber;
    const isCurrentQuarter = now.year === year && Math.ceil(now.month / 3) === quarter;

    // Generate week information
    const weeks: WeekInfo[] = [];
    for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
      const weekStart = DateTime.fromObject({
        weekNumber: weekNum,
        weekYear: year,
      }).startOf('week');

      weeks.push({
        weekNumber: weekNum,
        weekLabel: `Week ${weekNum}`,
        mondayDate: weekStart.toFormat('LLL d'),
        days: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i + 1,
          date: weekStart.plus({ days: i }).toFormat('LLL d'),
          dateTimestamp: weekStart.plus({ days: i }).toMillis(),
        })),
      });
    }

    return {
      weeks,
      startWeek,
      endWeek,
      startDate,
      endDate,
      currentWeekNumber,
      isCurrentQuarter,
    };
  }, [year, quarter]);
};
