import { DateTime } from 'luxon';

import type { TimePeriod } from './types';

/** ISO week-based quarter (Q1=1–13, Q2=14–26, Q3=27–39, Q4=40–53). */
function getQuarterFromWeekNumber(weekNumber: number): 1 | 2 | 3 | 4 {
  if (weekNumber <= 13) return 1;
  if (weekNumber <= 26) return 2;
  if (weekNumber <= 39) return 3;
  return 4;
}

/** Build a time period with quarter derived from the ISO week number. */
export function timePeriodFromISOWeek(weekYear: number, weekNumber: number): TimePeriod {
  return {
    year: weekYear,
    weekNumber,
    quarter: getQuarterFromWeekNumber(weekNumber),
  };
}

/** First ISO week of the quarter that contains `weekNumber`. */
function getFirstWeekOfQuarter(weekNumber: number): number {
  const quarter = getQuarterFromWeekNumber(weekNumber);
  return (quarter - 1) * 13 + 1;
}

export function isFirstWeekOfQuarter(weekNumber: number): boolean {
  return weekNumber === getFirstWeekOfQuarter(weekNumber);
}

/** Previous ISO week, handling year boundaries (e.g. W1 → W52/W53 of prior year). */
export function getPreviousISOWeek(period: TimePeriod): TimePeriod {
  const dt = DateTime.fromObject({
    weekYear: period.year,
    weekNumber: period.weekNumber,
    weekday: 1,
  }).minus({ weeks: 1 });

  return timePeriodFromISOWeek(dt.weekYear, dt.weekNumber);
}
