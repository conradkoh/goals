import type { DateTime } from 'luxon';
import { getFinalWeeksOfQuarter } from './';

/**
 * Debug utility to test date calculations for a specific date
 * Provides detailed information about the quarter, weeks, and calendar
 *
 * @param testDate - The date to analyze
 * @returns Object containing calendar information and quarter details
 */
export function debugQuarterCalculations(testDate: DateTime): {
  calendarInfo: {
    date: string;
    weekNumber: number;
    weekYear: number;
    quarter: number;
    year: number;
  };
  currentQuarter: {
    finalWeeks: Array<{ weekNumber: number; year: number }>;
  };
} {
  const quarter = Math.floor((testDate.month - 1) / 3) + 1;
  const year = testDate.year;

  // Get final weeks of the quarter
  const finalWeeks = getFinalWeeksOfQuarter(year, quarter);

  return {
    calendarInfo: {
      date: testDate.toFormat('yyyy-MM-dd'),
      weekNumber: testDate.weekNumber,
      weekYear: testDate.weekYear,
      quarter,
      year,
    },
    currentQuarter: {
      finalWeeks,
    },
  };
}
