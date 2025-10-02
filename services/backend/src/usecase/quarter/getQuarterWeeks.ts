import { DateTime } from 'luxon';
import { getQuarterDateRange } from './getQuarterDateRange';

/**
 * Get the number of ISO weeks in a year
 *
 * @param year - The year to check
 * @returns 52 or 53 depending on the year
 */
export function getWeeksInYear(year: number): number {
  // To get the correct number of weeks in a year:
  // 1. Get the last day of the year
  // 2. Get its week number
  // 3. If that week belongs to next year (Thursday is in next year), use the previous week
  const lastDay = DateTime.local(year, 12, 31);
  const lastDayThursday = lastDay.set({ weekday: 4 });

  if (lastDayThursday.year > year) {
    // Last week belongs to next year, use previous week
    return lastDay.minus({ weeks: 1 }).weekNumber;
  }

  return lastDay.weekNumber;
}

/**
 * Get week information for a quarter
 *
 * @param year - The year
 * @param quarter - The quarter (1-4)
 * @returns Object containing start week, end week, and all weeks in the quarter
 */
export function getQuarterWeeks(
  year: number,
  quarter: number
): {
  startWeek: number;
  endWeek: number;
  weeks: number[];
  startDate: DateTime;
  endDate: DateTime;
} {
  const { startDate, endDate } = getQuarterDateRange(year, quarter);

  // For accurate week numbers, we need to check if the date is actually in that week
  // by checking if Thursday of that week is in the quarter
  const weeks: number[] = [];
  let currentDate = startDate;

  // Keep adding weeks until we pass the end date
  while (currentDate <= endDate) {
    // Find Thursday of the current week
    const weekThursday = currentDate.set({ weekday: 4 });

    // If we're in Q1 and the Thursday is in the previous year,
    // we need to adjust the week number to be from the previous year
    if (quarter === 1 && weekThursday.year < year) {
      weeks.push(weekThursday.weekNumber);
    }
    // If we're in Q4 and the Thursday is in the next year,
    // we need to adjust the week number to be from the current year
    else if (quarter === 4 && weekThursday.year > year) {
      weeks.push(currentDate.weekNumber);
    }
    // Normal case - add the week if its Thursday falls within our quarter
    else if (weekThursday >= startDate && weekThursday <= endDate) {
      weeks.push(currentDate.weekNumber);
    }

    currentDate = currentDate.plus({ weeks: 1 });
  }

  // Get the first and last weeks that actually belong to this quarter
  const startWeek = weeks[0];
  const endWeek = weeks[weeks.length - 1];

  return {
    startWeek,
    endWeek,
    weeks,
    startDate,
    endDate,
  };
}

/**
 * Utility to get information about the first week of a quarter
 *
 * @param year - The year
 * @param quarter - The quarter (1-4)
 * @returns Object with week number and year
 */
export function getFirstWeekOfQuarter(
  year: number,
  quarter: number
): {
  weekNumber: number;
  year: number;
} {
  const { startDate } = getQuarterDateRange(year, quarter);
  // Find the first Thursday in the quarter to determine the first week
  let currentDate = startDate;
  while (currentDate.weekday !== 4) {
    currentDate = currentDate.plus({ days: 1 });
  }
  return {
    weekNumber: currentDate.weekNumber,
    year: currentDate.weekYear,
  };
}
