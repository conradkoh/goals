import { DateTime } from 'luxon';

/**
 * Gets the ISO week number for a given date.
 *
 * @param date - Date object or Unix timestamp
 * @returns ISO week number (1-52 or 1-53)
 */
export function getISOWeekNumber(date: Date | number): number {
  const dt = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
  return dt.weekNumber;
}

/**
 * Gets the year for ISO week numbering.
 * This may differ from the calendar year for dates at the beginning/end of the year.
 *
 * @param date - Date object or Unix timestamp
 * @returns ISO week year
 */
export function getISOWeekYear(date: Date | number): number {
  const dt = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
  return dt.weekYear;
}

/**
 * Gets the start date (Monday) of an ISO week.
 *
 * @param weekYear - ISO week year
 * @param weekNumber - ISO week number (1-52 or 1-53)
 * @returns Unix timestamp of Monday at 00:00:00 UTC
 */
export function getISOWeekStart(weekYear: number, weekNumber: number): number {
  const dt = DateTime.fromObject({
    weekYear,
    weekNumber,
    weekday: 1, // Monday
  });
  return dt.startOf('day').toMillis();
}

/**
 * Gets the end date (Sunday) of an ISO week.
 *
 * @param weekYear - ISO week year
 * @param weekNumber - ISO week number (1-52 or 1-53)
 * @returns Unix timestamp of Sunday at 23:59:59 UTC
 */
export function getISOWeekEnd(weekYear: number, weekNumber: number): number {
  const dt = DateTime.fromObject({
    weekYear,
    weekNumber,
    weekday: 7, // Sunday
  });
  return dt.endOf('day').toMillis();
}

/**
 * Gets all ISO week numbers for a given year.
 *
 * @param year - Calendar year
 * @returns Array of ISO week numbers for the year
 */
export function getISOWeeksInYear(year: number): number[] {
  const weeks: number[] = [];

  // Start from January 1st and find the first ISO week
  let dt = DateTime.fromObject({ year, month: 1, day: 1 });

  // Find the first Monday of the year or the Monday of the first ISO week
  while (dt.weekYear !== year || dt.weekNumber !== 1) {
    dt = dt.plus({ days: 1 });
  }

  // Collect all weeks for this ISO week year
  const isoWeekYear = dt.weekYear;
  while (dt.weekYear === isoWeekYear) {
    if (!weeks.includes(dt.weekNumber)) {
      weeks.push(dt.weekNumber);
    }
    dt = dt.plus({ weeks: 1 });
  }

  return weeks.sort((a, b) => a - b);
}

/**
 * Checks if a date falls within a specific ISO week.
 *
 * @param date - Date to check (Date object or Unix timestamp)
 * @param weekYear - ISO week year to check against
 * @param weekNumber - ISO week number to check against
 * @returns True if the date falls within the specified ISO week
 */
export function isDateInISOWeek(
  date: Date | number,
  weekYear: number,
  weekNumber: number
): boolean {
  const dt = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
  return dt.weekYear === weekYear && dt.weekNumber === weekNumber;
}

/**
 * Gets the current ISO week number and year.
 *
 * @returns Object with current ISO week year and week number
 */
export function getCurrentISOWeek(): { weekYear: number; weekNumber: number } {
  const now = DateTime.now();
  return {
    weekYear: now.weekYear,
    weekNumber: now.weekNumber,
  };
}
