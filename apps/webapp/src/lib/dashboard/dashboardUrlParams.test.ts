import { describe, expect, it } from 'vitest';

import {
  applyDashboardUrlUpdates,
  buildMissingDashboardDefaults,
  buildUrlParamsForViewModeChange,
  parseViewMode,
} from './dashboardUrlParams';

import { DayOfWeek } from '@/lib/constants';

const defaults = {
  year: 2026,
  quarter: 2 as const,
  week: 24,
  day: DayOfWeek.WEDNESDAY,
};

describe('parseViewMode', () => {
  it('returns valid view modes from the URL', () => {
    expect(parseViewMode('focused', 'quarterly')).toBe('focused');
  });

  it('falls back for invalid values', () => {
    expect(parseViewMode('invalid', 'quarterly')).toBe('quarterly');
    expect(parseViewMode(null, 'daily')).toBe('daily');
  });
});

describe('buildUrlParamsForViewModeChange', () => {
  it('drops stale week/day/quarter params when switching to focused', () => {
    const current = new URLSearchParams('view-mode=daily&week=10&day=5&year=2026&quarter=1');

    const next = buildUrlParamsForViewModeChange(current, 'focused', defaults);

    expect(next.get('view-mode')).toBe('focused');
    expect(next.get('year')).toBe('2026');
    expect(next.has('week')).toBe(false);
    expect(next.has('day')).toBe(false);
    expect(next.has('quarter')).toBe(false);
  });

  it('keeps only quarterly params when switching to quarterly', () => {
    const current = new URLSearchParams('view-mode=daily&week=10&day=5&year=2026&quarter=1');

    const next = buildUrlParamsForViewModeChange(current, 'quarterly', defaults);

    expect(next.get('view-mode')).toBe('quarterly');
    expect(next.get('year')).toBe('2026');
    expect(next.get('quarter')).toBe('1');
    expect(next.has('week')).toBe(false);
    expect(next.has('day')).toBe(false);
  });

  it('keeps week but drops day and quarter when switching to weekly', () => {
    const current = new URLSearchParams('view-mode=daily&week=10&day=5&year=2026&quarter=1');

    const next = buildUrlParamsForViewModeChange(current, 'weekly', defaults);

    expect(next.get('view-mode')).toBe('weekly');
    expect(next.get('year')).toBe('2026');
    expect(next.get('week')).toBe('10');
    expect(next.has('day')).toBe(false);
    expect(next.has('quarter')).toBe(false);
  });

  it('keeps week and day when switching to daily', () => {
    const current = new URLSearchParams('view-mode=focused&year=2026&quarter=3');

    const next = buildUrlParamsForViewModeChange(current, 'daily', defaults);

    expect(next.get('view-mode')).toBe('daily');
    expect(next.get('year')).toBe('2026');
    expect(next.get('week')).toBe('24');
    expect(next.get('day')).toBe(String(DayOfWeek.WEDNESDAY));
    expect(next.has('quarter')).toBe(false);
  });
});

describe('applyDashboardUrlUpdates', () => {
  it('merges partial updates onto existing params', () => {
    const current = new URLSearchParams('view-mode=weekly&week=10&year=2026');
    const next = applyDashboardUrlUpdates(current, { week: 11 });

    expect(next.get('week')).toBe('11');
    expect(next.get('view-mode')).toBe('weekly');
  });
});

describe('buildMissingDashboardDefaults', () => {
  it('returns null when all required params already exist', () => {
    const current = new URLSearchParams('view-mode=daily&week=10&day=5&year=2026&quarter=1');

    expect(buildMissingDashboardDefaults(current, 'daily', defaults, false)).toBeNull();
  });

  it('fills missing defaults for a new dashboard visit', () => {
    const current = new URLSearchParams();

    expect(buildMissingDashboardDefaults(current, 'quarterly', defaults, false)).toEqual({
      viewMode: 'quarterly',
      year: 2026,
      quarter: 2,
    });
  });
});
