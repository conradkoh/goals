import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { DateTime } from 'luxon';

import { getInitiativeDateStatus } from '@/lib/date/initiative-dates';

/** Initiatives shown in the focus view inline list — active only. */
export function filterInitiativesForFocusView(
  initiatives: Doc<'initiatives'>[],
  now: DateTime = DateTime.now()
): Doc<'initiatives'>[] {
  return initiatives.filter(
    (i) => getInitiativeDateStatus(i.startDate, i.endDate, now) !== 'ended'
  );
}

/** Whether an initiative's date range overlaps [windowStart, windowEnd] (inclusive, day boundaries). */
function initiativeOverlapsDateWindow(
  initiative: Pick<Doc<'initiatives'>, 'startDate' | 'endDate'>,
  windowStartMs: number,
  windowEndMs: number
): boolean {
  if (initiative.startDate > windowEndMs) return false;
  if (initiative.endDate !== undefined && initiative.endDate < windowStartMs) return false;
  return true;
}

const INITIATIVE_RECENT_WINDOW_MONTHS = 6;

/** Initiatives whose date range overlaps the last N months ending at `now`. */
function filterInitiativesInRecentWindow(
  initiatives: Doc<'initiatives'>[],
  now: DateTime = DateTime.now(),
  months: number = INITIATIVE_RECENT_WINDOW_MONTHS
): Doc<'initiatives'>[] {
  const windowStartMs = now.minus({ months }).startOf('day').toMillis();
  const windowEndMs = now.endOf('day').toMillis();
  return initiatives.filter((i) => initiativeOverlapsDateWindow(i, windowStartMs, windowEndMs));
}

/** Case-insensitive title search across all initiatives. */
function filterInitiativesBySearch(
  initiatives: Doc<'initiatives'>[],
  query: string
): Doc<'initiatives'>[] {
  const lower = query.trim().toLowerCase();
  if (!lower) return initiatives;
  return initiatives.filter((i) => i.title.toLowerCase().includes(lower));
}

/**
 * Browse dialog list: recent-window results when query is empty;
 * full-list search results when query is non-empty.
 */
export function getInitiativesForBrowse(
  initiatives: Doc<'initiatives'>[],
  query: string,
  now: DateTime = DateTime.now()
): Doc<'initiatives'>[] {
  const trimmed = query.trim();
  if (!trimmed) return filterInitiativesInRecentWindow(initiatives, now);
  return filterInitiativesBySearch(initiatives, trimmed);
}
