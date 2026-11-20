import { describe, expect, it } from 'vitest';

import { isoWeekOf } from './iso-week.js';

/** Local noon of a calendar date, so the zone's DST shift cannot cross midnight. */
function localNoon(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12).getTime();
}

describe('isoWeekOf', () => {
  it.each([
    ['2026-01-01', 2026, 1, 1, 2026, 1],
    ['2024-12-30', 2024, 12, 30, 2025, 1],
    ['2019-12-30', 2019, 12, 30, 2020, 1],
    ['2021-01-03', 2021, 1, 3, 2020, 53],
    ['2016-01-03', 2016, 1, 3, 2015, 53],
    ['2020-12-31', 2020, 12, 31, 2020, 53],
    ['2026-12-31', 2026, 12, 31, 2026, 53],
    ['2027-01-01', 2027, 1, 1, 2026, 53],
    ['2027-01-04', 2027, 1, 4, 2027, 1],
    ['2025-06-15', 2025, 6, 15, 2025, 24],
    ['2025-06-16', 2025, 6, 16, 2025, 25],
    ['2025-03-30', 2025, 3, 30, 2025, 13],
  ])('%s is %i W%i', (_label, year, month, day, expectedYear, expectedWeek) => {
    expect(isoWeekOf(localNoon(year, month, day))).toEqual({
      year: expectedYear,
      week: expectedWeek,
    });
  });
});
