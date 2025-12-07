import { getQuarterDateRange } from './getQuarterDateRange';

/**
 * Get the final week(s) of a quarter
 * Handles the special case where the last week might span a year boundary
 *
 * @param year - The year
 * @param quarter - The quarter (1-4)
 * @returns Array of final week information objects, typically just one but could be two at year boundaries
 */
export function getFinalWeeksOfQuarter(
  year: number,
  quarter: number
): Array<{
  weekNumber: number;
  year: number;
}> {
  const { endDate } = getQuarterDateRange(year, quarter);
  const result: Array<{ weekNumber: number; year: number }> = [];

  // Find the Thursday of the last week
  let lastThursday = endDate.set({ weekday: 4 });
  if (lastThursday > endDate) {
    // If Thursday is after the quarter end, use the previous week's Thursday
    lastThursday = lastThursday.minus({ weeks: 1 });
  }

  // Add the week containing the last Thursday of the quarter
  result.push({
    weekNumber: lastThursday.weekNumber,
    year: lastThursday.weekYear,
  });

  return result;
}

/**
 * Tests if a state belongs to one of the provided final weeks
 *
 * @param state - The goal state with weekNumber and year properties
 * @param finalWeeks - Array of final week information objects
 * @returns True if the state belongs to one of the final weeks
 */
export function isInFinalWeeks(
  state: { weekNumber: number; year: number },
  finalWeeks: Array<{ weekNumber: number; year: number }>
): boolean {
  return finalWeeks.some(
    (finalWeek) => state.weekNumber === finalWeek.weekNumber && state.year === finalWeek.year
  );
}
