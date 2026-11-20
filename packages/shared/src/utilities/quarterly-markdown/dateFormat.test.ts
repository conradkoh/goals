import { describe, expect, it } from 'vitest';

import { formatDateKey, formatDay, formatDayFromKey, formatGeneratedAt } from './dateFormat';

const NOV_19_1230_UTC = Date.UTC(2026, 10, 19, 12, 30);

describe('formatDay', () => {
  it('formats in UTC', () => {
    expect(formatDay(NOV_19_1230_UTC, 'UTC')).toBe('Nov 19, 2026');
  });

  it('formats the same instant in Pacific/Auckland', () => {
    expect(formatDay(NOV_19_1230_UTC, 'Pacific/Auckland')).toBe('Nov 20, 2026');
  });

  it('pads the year and keeps the day unpadded', () => {
    expect(formatDay(Date.UTC(2026, 2, 5, 12, 0), 'UTC')).toBe('Mar 5, 2026');
  });
});

describe('formatDateKey', () => {
  it('formats a yyyy-MM-dd key in UTC', () => {
    expect(formatDateKey(NOV_19_1230_UTC, 'UTC')).toBe('2026-11-19');
  });

  it('formats a yyyy-MM-dd key in Pacific/Auckland', () => {
    expect(formatDateKey(NOV_19_1230_UTC, 'Pacific/Auckland')).toBe('2026-11-20');
  });

  it('zero-pads month and day', () => {
    expect(formatDateKey(Date.UTC(2026, 2, 5, 12, 0), 'UTC')).toBe('2026-03-05');
  });
});

describe('formatDayFromKey', () => {
  it('renders a date key without a zone', () => {
    expect(formatDayFromKey('2026-03-05')).toBe('Mar 5, 2026');
  });
});

describe('formatGeneratedAt', () => {
  it('formats noon-adjacent times in UTC', () => {
    expect(formatGeneratedAt(NOV_19_1230_UTC, 'UTC')).toBe('Nov 19, 2026 at 12:30 PM');
  });

  it('formats the same instant in Pacific/Auckland', () => {
    expect(formatGeneratedAt(NOV_19_1230_UTC, 'Pacific/Auckland')).toBe('Nov 20, 2026 at 1:30 AM');
  });

  it('renders midnight as 12 AM', () => {
    expect(formatGeneratedAt(Date.UTC(2026, 0, 1, 0, 5), 'UTC')).toBe('Jan 1, 2026 at 12:05 AM');
  });

  it('renders noon as 12 PM', () => {
    expect(formatGeneratedAt(Date.UTC(2026, 0, 1, 12, 0), 'UTC')).toBe('Jan 1, 2026 at 12:00 PM');
  });

  it('renders the last minute of the day as 11:59 PM', () => {
    expect(formatGeneratedAt(Date.UTC(2026, 0, 1, 23, 59), 'UTC')).toBe('Jan 1, 2026 at 11:59 PM');
  });

  it('never emits narrow or non-breaking spaces', () => {
    const out = formatGeneratedAt(NOV_19_1230_UTC, 'UTC');
    expect(out).not.toContain('\u202F');
    expect(out).not.toContain('\u00A0');
  });
});
