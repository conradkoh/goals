import type { ViewMode } from '@/components/molecules/focus/constants';
import { DayOfWeek } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

const VIEW_MODES: readonly ViewMode[] = ['daily', 'weekly', 'quarterly', 'focused'];

export interface DashboardNavigationDefaults {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  week: number;
  day: DayOfWeek;
}

export interface DashboardUrlUpdates {
  week?: number;
  day?: DayOfWeek;
  viewMode?: ViewMode;
  year?: number;
  quarter?: number;
  focusMode?: boolean;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function parseQuarter(value: string | null): 1 | 2 | 3 | 4 | undefined {
  const parsed = parsePositiveInt(value);
  if (parsed === undefined || parsed < 1 || parsed > 4) {
    return undefined;
  }

  return parsed as 1 | 2 | 3 | 4;
}

function parseDay(value: string | null): DayOfWeek | undefined {
  const parsed = parsePositiveInt(value);
  if (parsed === undefined || parsed < DayOfWeek.MONDAY || parsed > DayOfWeek.SUNDAY) {
    return undefined;
  }

  return parsed as DayOfWeek;
}

/** Parses a view-mode query value, falling back when missing or invalid. */
export function parseViewMode(value: string | null, fallback: ViewMode): ViewMode {
  if (value !== null && VIEW_MODES.includes(value as ViewMode)) {
    return value as ViewMode;
  }

  return fallback;
}

/**
 * Builds canonical dashboard URL search params for a view-mode change.
 *
 * When every navigation param is present in the URL, stale week/day/quarter values
 * can disagree and make view switches appear to do nothing. Each view mode keeps
 * only the params it needs and drops the rest.
 */
// fallow-ignore-next-line complexity
export function buildUrlParamsForViewModeChange(
  current: URLSearchParams,
  newViewMode: ViewMode,
  defaults: DashboardNavigationDefaults
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  next.set('view-mode', newViewMode);

  const year = parsePositiveInt(current.get('year')) ?? defaults.year;
  const week = parsePositiveInt(current.get('week')) ?? defaults.week;
  const day = parseDay(current.get('day')) ?? defaults.day;
  const quarter =
    parseQuarter(current.get('quarter')) ?? getQuarterFromWeek(week) ?? defaults.quarter;

  next.set('year', year.toString());

  switch (newViewMode) {
    case 'quarterly': {
      next.set('quarter', quarter.toString());
      next.delete('week');
      next.delete('day');
      break;
    }
    case 'weekly': {
      next.set('week', week.toString());
      next.delete('quarter');
      next.delete('day');
      break;
    }
    case 'daily': {
      next.set('week', week.toString());
      next.set('day', day.toString());
      next.delete('quarter');
      break;
    }
    case 'focused': {
      next.delete('week');
      next.delete('day');
      next.delete('quarter');
      break;
    }
  }

  return next;
}

/** Applies partial dashboard navigation updates onto existing search params. */
// fallow-ignore-next-line complexity
export function applyDashboardUrlUpdates(
  current: URLSearchParams,
  updates: DashboardUrlUpdates
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  if (updates.week !== undefined) {
    next.set('week', updates.week.toString());
  }

  if (updates.day !== undefined) {
    next.set('day', updates.day.toString());
  }

  if (updates.viewMode !== undefined) {
    next.set('view-mode', updates.viewMode);
  }

  if (updates.year !== undefined) {
    next.set('year', updates.year.toString());
  }

  if (updates.quarter !== undefined) {
    next.set('quarter', updates.quarter.toString());
  }

  if (updates.focusMode !== undefined) {
    next.set('focus-mode', updates.focusMode.toString());
  }

  return next;
}
