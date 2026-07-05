import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import {
  formatInitiativeDateRange,
  getInitiativeDateStatus,
  normalizeInitiativeDates,
} from './initiative-dates';

describe('normalizeInitiativeDates', () => {
  it('normalizes start to start of day and end to end of day', () => {
    const start = new Date(2026, 2, 15, 14, 30, 0);
    const end = new Date(2026, 5, 30, 9, 0, 0);

    const { startDate, endDate } = normalizeInitiativeDates(start, end);

    expect(startDate).toBe(
      DateTime.fromObject({ year: 2026, month: 3, day: 15 }).startOf('day').toMillis()
    );
    expect(endDate).toBe(
      DateTime.fromObject({ year: 2026, month: 6, day: 30 }).endOf('day').toMillis()
    );
  });

  it('returns only startDate when end is omitted', () => {
    const start = new Date(2026, 2, 15, 14, 30, 0);

    const result = normalizeInitiativeDates(start);

    expect(result).toEqual({
      startDate: DateTime.fromObject({ year: 2026, month: 3, day: 15 }).startOf('day').toMillis(),
    });
    expect(result.endDate).toBeUndefined();
  });
});

describe('getInitiativeDateStatus', () => {
  const now = DateTime.fromObject({ year: 2026, month: 3, day: 15, hour: 12 });

  it('returns active when today falls within the range', () => {
    const startDate = now.minus({ days: 5 }).startOf('day').toMillis();
    const endDate = now.plus({ days: 5 }).endOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, endDate, now)).toBe('active');
  });

  it('returns active when range starts today', () => {
    const startDate = now.startOf('day').toMillis();
    const endDate = now.plus({ days: 10 }).endOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, endDate, now)).toBe('active');
  });

  it('returns active when range ends today', () => {
    const startDate = now.minus({ days: 10 }).startOf('day').toMillis();
    const endDate = now.endOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, endDate, now)).toBe('active');
  });

  it('returns upcoming when start is after today', () => {
    const startDate = now.plus({ days: 1 }).startOf('day').toMillis();
    const endDate = now.plus({ days: 10 }).endOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, endDate, now)).toBe('upcoming');
  });

  it('returns ended when end is before today', () => {
    const startDate = now.minus({ days: 20 }).startOf('day').toMillis();
    const endDate = now.minus({ days: 1 }).endOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, endDate, now)).toBe('ended');
  });

  it('returns active when end is undefined and start is in the past', () => {
    const startDate = now.minus({ days: 10 }).startOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, undefined, now)).toBe('active');
  });

  it('returns active when end is undefined and start is today', () => {
    const startDate = now.startOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, undefined, now)).toBe('active');
  });

  it('returns upcoming when end is undefined and start is in the future', () => {
    const startDate = now.plus({ days: 1 }).startOf('day').toMillis();
    expect(getInitiativeDateStatus(startDate, undefined, now)).toBe('upcoming');
  });
});

describe('formatInitiativeDateRange', () => {
  it('formats a date range for display', () => {
    const startDate = DateTime.fromObject({ year: 2026, month: 1, day: 5 })
      .startOf('day')
      .toMillis();
    const endDate = DateTime.fromObject({ year: 2026, month: 3, day: 20 }).endOf('day').toMillis();
    expect(formatInitiativeDateRange(startDate, endDate)).toBe('Jan 5, 2026 – Mar 20, 2026');
  });

  it('formats ongoing initiatives when end is undefined', () => {
    const startDate = DateTime.fromObject({ year: 2026, month: 1, day: 5 })
      .startOf('day')
      .toMillis();
    expect(formatInitiativeDateRange(startDate, undefined)).toBe('Jan 5, 2026 – ongoing');
  });
});
