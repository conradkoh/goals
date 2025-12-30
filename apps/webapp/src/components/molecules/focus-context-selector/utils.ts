/**
 * @file Utility functions for focus context selectors.
 */

/**
 * Gets the first week number for a given quarter.
 * @param quarter - Quarter number (1-4)
 * @returns First week number of the quarter
 */
export function getFirstWeekOfQuarter(quarter: 1 | 2 | 3 | 4): number {
  const quarterStartWeeks: Record<1 | 2 | 3 | 4, number> = {
    1: 1, // Q1 starts at week 1
    2: 14, // Q2 starts around week 14
    3: 27, // Q3 starts around week 27
    4: 40, // Q4 starts around week 40
  };
  return quarterStartWeeks[quarter];
}
