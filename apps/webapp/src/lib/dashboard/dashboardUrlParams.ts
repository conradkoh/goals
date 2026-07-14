import type { ViewMode } from '@/components/molecules/focus/constants';
import type { DayOfWeek } from '@/lib/constants';

export const VIEW_MODES: readonly ViewMode[] = ['daily', 'weekly', 'quarterly', 'focused'];

export interface DashboardUrlUpdates {
  week?: number;
  day?: DayOfWeek;
  year?: number;
  quarter?: number;
  focusMode?: boolean;
}

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

export function parseViewMode(value: string | null | undefined, fallback: ViewMode): ViewMode {
  if (value != null && isViewMode(value)) return value;
  return fallback;
}

export function getViewModeFromPathname(pathname: string): ViewMode | null {
  const match = pathname.match(/^\/app\/(daily|weekly|quarterly|focused)(?:\/|$)/);
  if (match) {
    return match[1] as ViewMode;
  }
  return null;
}

export function buildDashboardViewHref(viewMode: ViewMode): string {
  return `/app/${viewMode}`;
}

export function buildDashboardHref(
  viewMode: ViewMode,
  current: URLSearchParams,
  updates: DashboardUrlUpdates
): string {
  const next = applyDashboardUrlUpdates(current, updates);
  const qs = next.toString();
  return qs ? `/app/${viewMode}?${qs}` : `/app/${viewMode}`;
}

export function getLegacyViewModeRedirectHref(searchParams: URLSearchParams): string | null {
  const viewMode = searchParams.get('view-mode');
  if (viewMode && isViewMode(viewMode)) {
    return buildDashboardViewHref(viewMode);
  }
  return null;
}

export function applyDashboardUrlUpdates(
  current: URLSearchParams,
  updates: DashboardUrlUpdates
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  next.delete('view-mode');

  if (updates.week !== undefined) {
    next.set('week', updates.week.toString());
  }

  if (updates.day !== undefined) {
    next.set('day', updates.day.toString());
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
