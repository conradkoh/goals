import { describe, expect, test } from 'vitest';

import { getPreviousISOWeek, isFirstWeekOfQuarter, timePeriodFromISOWeek } from './weekPeriod';

describe('weekPeriod helpers', () => {
  test('getQuarterFromWeekNumber maps ISO week ranges', () => {
    expect(timePeriodFromISOWeek(2026, 1).quarter).toBe(1);
    expect(timePeriodFromISOWeek(2026, 13).quarter).toBe(1);
    expect(timePeriodFromISOWeek(2026, 14).quarter).toBe(2);
    expect(timePeriodFromISOWeek(2026, 26).quarter).toBe(2);
    expect(timePeriodFromISOWeek(2026, 27).quarter).toBe(3);
    expect(timePeriodFromISOWeek(2026, 40).quarter).toBe(4);
  });

  test('getPreviousISOWeek crosses quarter boundary with correct quarter', () => {
    expect(getPreviousISOWeek({ year: 2026, quarter: 2, weekNumber: 14 })).toEqual({
      year: 2026,
      quarter: 1,
      weekNumber: 13,
    });
  });

  test('getPreviousISOWeek crosses year boundary', () => {
    const previous = getPreviousISOWeek({ year: 2026, quarter: 1, weekNumber: 1 });
    expect(previous.weekNumber).toBeGreaterThanOrEqual(52);
    expect(previous.year).toBe(2025);
    expect(previous.quarter).toBe(4);
  });

  test('timePeriodFromISOWeek derives quarter from week number', () => {
    expect(timePeriodFromISOWeek(2026, 25)).toEqual({
      year: 2026,
      quarter: 2,
      weekNumber: 25,
    });
  });

  test('isFirstWeekOfQuarter identifies quarter start weeks', () => {
    expect(isFirstWeekOfQuarter(1)).toBe(true);
    expect(isFirstWeekOfQuarter(14)).toBe(true);
    expect(isFirstWeekOfQuarter(27)).toBe(true);
    expect(isFirstWeekOfQuarter(40)).toBe(true);
    expect(isFirstWeekOfQuarter(26)).toBe(false);
    expect(timePeriodFromISOWeek(2026, 26).quarter).toBe(2);
  });
});
