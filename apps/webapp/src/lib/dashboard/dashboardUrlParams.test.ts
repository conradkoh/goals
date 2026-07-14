import { describe, expect, it } from 'vitest';

import {
  buildDashboardHref,
  buildDashboardViewHref,
  getLegacyViewModeRedirectHref,
  getViewModeFromPathname,
  isViewMode,
} from './dashboardUrlParams';

import { DayOfWeek } from '@/lib/constants';

describe('isViewMode', () => {
  it('returns true for valid view modes', () => {
    expect(isViewMode('daily')).toBe(true);
    expect(isViewMode('weekly')).toBe(true);
    expect(isViewMode('quarterly')).toBe(true);
    expect(isViewMode('focused')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isViewMode('invalid')).toBe(false);
    expect(isViewMode('')).toBe(false);
  });
});

describe('getViewModeFromPathname', () => {
  it('extracts view mode from pathname', () => {
    expect(getViewModeFromPathname('/app/quarterly')).toBe('quarterly');
    expect(getViewModeFromPathname('/app/weekly')).toBe('weekly');
    expect(getViewModeFromPathname('/app/daily')).toBe('daily');
    expect(getViewModeFromPathname('/app/focused')).toBe('focused');
  });

  it('extracts view mode from pathname with trailing slash', () => {
    expect(getViewModeFromPathname('/app/quarterly/')).toBe('quarterly');
  });

  it('returns null for non-view routes', () => {
    expect(getViewModeFromPathname('/app')).toBeNull();
    expect(getViewModeFromPathname('/app/')).toBeNull();
    expect(getViewModeFromPathname('/app/admin')).toBeNull();
    expect(getViewModeFromPathname('/app/documents')).toBeNull();
    expect(getViewModeFromPathname('/app/goals')).toBeNull();
    expect(getViewModeFromPathname('/app/profile')).toBeNull();
  });
});

describe('buildDashboardViewHref', () => {
  it('builds canonical view hrefs', () => {
    expect(buildDashboardViewHref('focused')).toBe('/app/focused');
    expect(buildDashboardViewHref('daily')).toBe('/app/daily');
    expect(buildDashboardViewHref('weekly')).toBe('/app/weekly');
    expect(buildDashboardViewHref('quarterly')).toBe('/app/quarterly');
  });
});

describe('buildDashboardHref', () => {
  it('merges week updates and never emits view-mode', () => {
    const current = new URLSearchParams('year=2026&view-mode=weekly');
    const href = buildDashboardHref('weekly', current, { week: 11 });

    expect(href).toBe('/app/weekly?year=2026&week=11');
    expect(href).not.toContain('view-mode');
  });

  it('merges quarter updates and never emits view-mode', () => {
    const current = new URLSearchParams('year=2026&view-mode=quarterly');
    const href = buildDashboardHref('quarterly', current, { quarter: 3 });

    expect(href).toBe('/app/quarterly?year=2026&quarter=3');
    expect(href).not.toContain('view-mode');
  });

  it('returns clean path when no params', () => {
    const current = new URLSearchParams();
    const href = buildDashboardHref('weekly', current, {});

    expect(href).toBe('/app/weekly');
  });

  it('handles focus-mode toggle', () => {
    const current = new URLSearchParams('year=2026');
    const href = buildDashboardHref('focused', current, { focusMode: true });

    expect(href).toBe('/app/focused?year=2026&focus-mode=true');
    expect(href).not.toContain('view-mode');
  });

  it('merges day update', () => {
    const current = new URLSearchParams('year=2026&week=24');
    const href = buildDashboardHref('daily', current, { day: DayOfWeek.WEDNESDAY });

    expect(href).toBe('/app/daily?year=2026&week=24&day=3');
    expect(href).not.toContain('view-mode');
  });

  it('strips legacy view-mode when applying empty updates', () => {
    const current = new URLSearchParams('view-mode=weekly&week=10&year=2026');
    const href = buildDashboardHref('weekly', current, {});

    expect(href).toBe('/app/weekly?week=10&year=2026');
    expect(href).not.toContain('view-mode');
  });
});

describe('getLegacyViewModeRedirectHref', () => {
  it('maps view-mode=daily to /app/daily', () => {
    const params = new URLSearchParams('view-mode=daily&week=10');
    expect(getLegacyViewModeRedirectHref(params)).toBe('/app/daily');
  });

  it('maps view-mode=weekly to /app/weekly', () => {
    const params = new URLSearchParams('view-mode=weekly');
    expect(getLegacyViewModeRedirectHref(params)).toBe('/app/weekly');
  });

  it('maps view-mode=quarterly to /app/quarterly', () => {
    const params = new URLSearchParams('view-mode=quarterly');
    expect(getLegacyViewModeRedirectHref(params)).toBe('/app/quarterly');
  });

  it('maps view-mode=focused to /app/focused', () => {
    const params = new URLSearchParams('view-mode=focused');
    expect(getLegacyViewModeRedirectHref(params)).toBe('/app/focused');
  });

  it('returns null when no view-mode param', () => {
    const params = new URLSearchParams('week=10&year=2026');
    expect(getLegacyViewModeRedirectHref(params)).toBeNull();
  });

  it('returns null for invalid view-mode', () => {
    const params = new URLSearchParams('view-mode=invalid');
    expect(getLegacyViewModeRedirectHref(params)).toBeNull();
  });
});
