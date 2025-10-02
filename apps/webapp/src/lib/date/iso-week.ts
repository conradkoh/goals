import { DateTime } from 'luxon';

/**
 * ISO-8601 Week Date System
 *
 * The ISO week date system is part of the ISO 8601 date and time standard.
 * It provides a standardized way to represent dates based on weeks.
 *
 * Key Rules:
 * 1. Weeks start on Monday (day 1) and end on Sunday (day 7)
 * 2. Week 01 of a year is the week containing the first Thursday of that year
 * 3. A week belongs to the year containing its Thursday
 *
 * Examples:
 * - If Jan 1 is Fri/Sat/Sun → those days belong to the last week of previous year
 * - If Dec 31 is Mon/Tue/Wed → those days belong to week 1 of next year
 *
 * A year in the ISO week date system (also called ISO year) can have:
 * - 52 weeks in most years
 * - 53 weeks in leap years that start on Thursday or normal years that start on Wednesday
 */

export interface ISOWeekInfo {
  /**
   * The ISO week number (1-53)
   */
  weekNumber: number;

  /**
   * The year this week belongs to according to ISO rules
   * Note: This might be different from the calendar year for days
   * at the start/end of a year
   */
  year: number;

  /**
   * The quarter this week belongs to (1-4)
   * Determined by the Thursday of the week
   */
  quarter: number;
}

/**
 * Get ISO week information for a given date
 *
 * @param date - The date to get week information for
 * @returns Object containing week number, ISO year, and quarter
 *
 * @example
 * // Get week info for January 1, 2025
 * const info = getISOWeekInfo(new Date(2025, 0, 1));
 * // If Jan 1 2025 is a Wednesday, it belongs to week 1 of 2025
 * // If Jan 1 2025 is a Friday, it belongs to week 53 of 2024
 */
export function getISOWeekInfo(date: Date): ISOWeekInfo {
  // Convert to Luxon DateTime which implements ISO week date calculations
  const dateTime = DateTime.fromJSDate(date);

  // Get the Thursday of this week (add days if before Thursday, subtract if after)
  const thursday = dateTime.startOf('week').plus({ days: 3 });

  return {
    weekNumber: dateTime.weekNumber,
    year: thursday.year,
    quarter: Math.ceil(thursday.month / 3),
  };
}

/**
 * Generate a sequence of ISO week information between two dates
 *
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Array of week information for each week between start and end dates
 *
 * @example
 * // Get all weeks in Q1 2025
 * const weeks = generateISOWeeks(
 *   new Date(2025, 0, 1),  // Jan 1
 *   new Date(2025, 2, 31)  // Mar 31
 * );
 */
export function generateISOWeeks(startDate: Date, endDate: Date): ISOWeekInfo[] {
  const weeks: ISOWeekInfo[] = [];

  // Convert to Luxon DateTime and ensure we start at the beginning of the week
  let currentDateTime = DateTime.fromJSDate(startDate).startOf('week');
  const endDateTime = DateTime.fromJSDate(endDate).endOf('week');

  while (currentDateTime <= endDateTime) {
    // Get the Thursday of this week to determine the ISO year and quarter
    const thursday = currentDateTime.plus({ days: 3 });

    weeks.push({
      weekNumber: currentDateTime.weekNumber,
      year: thursday.year,
      quarter: Math.ceil(thursday.month / 3),
    });

    // Move to the next week
    currentDateTime = currentDateTime.plus({ weeks: 1 });
  }

  return weeks;
}

/**
 * Check if a year has 53 ISO weeks
 *
 * A year has 53 weeks if:
 * 1. The year starts on Thursday (normal year)
 * 2. The year starts on Wednesday (leap year)
 *
 * @param year - The year to check
 * @returns true if the year has 53 weeks, false otherwise
 */
export function hasLongYear(year: number): boolean {
  const jan1 = DateTime.local(year, 1, 1);
  const isLeapYear = jan1.isInLeapYear;
  const jan1WeekDay = jan1.weekday;

  return (
    jan1WeekDay === 4 || // Year starts on Thursday
    (jan1WeekDay === 3 && isLeapYear) // Year starts on Wednesday and is leap year
  );
}

/**
 * Get the number of ISO weeks in a year
 *
 * @param year - The year to check
 * @returns 52 or 53 depending on the year
 */
export function getWeeksInYear(year: number): 52 | 53 {
  return hasLongYear(year) ? 53 : 52;
}
