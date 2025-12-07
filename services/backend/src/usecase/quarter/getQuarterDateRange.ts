import { DateTime } from 'luxon';

/**
 * Get the start and end dates for a specific quarter
 *
 * @param year - The year
 * @param quarter - The quarter (1-4)
 * @returns Object containing start and end dates of the quarter
 */
export function getQuarterDateRange(
  year: number,
  quarter: number
): {
  startDate: DateTime;
  endDate: DateTime;
} {
  const startMonth = (quarter - 1) * 3 + 1; // Month is 1-based in DateTime
  const startDate = DateTime.local(year, startMonth, 1);
  const endDate = startDate.plus({ months: 3 }).minus({ days: 1 });

  return { startDate, endDate };
}

/**
 * Get the previous quarter information
 *
 * @param year - Current year
 * @param quarter - Current quarter (1-4)
 * @returns Object containing year and quarter of the previous quarter
 */
export function getPreviousQuarter(
  year: number,
  quarter: number
): {
  year: number;
  quarter: 1 | 2 | 3 | 4;
} {
  if (quarter === 1) {
    return { year: year - 1, quarter: 4 };
  }
  return { year, quarter: (quarter - 1) as 1 | 2 | 3 | 4 };
}
