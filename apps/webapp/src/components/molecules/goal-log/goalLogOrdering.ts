/**
 * @file Display ordering for goal log entries. The single source for the list order, the
 * Show all cap, and the rule for whether an entry would be hidden by the cap.
 */

import { DateTime } from 'luxon';

/** The fields ordering reads. A GoalLog satisfies this shape. */
export interface OrderableLogEntry {
  _id: string;
  logDate: number;
  createdAt: number;
}

/** Local ISO date key (YYYY-MM-DD) that an entry is grouped under. */
export function dayKeyOf(logDate: number): string {
  return DateTime.fromMillis(logDate).toISODate() ?? 'unknown';
}

/**
 * Orders entries the way the list displays them: day descending, then createdAt descending.
 * Returns a new array; the input is not mutated.
 */
function sortForDisplay<T extends OrderableLogEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const byDay = dayKeyOf(b.logDate).localeCompare(dayKeyOf(a.logDate));
    return byDay !== 0 ? byDay : b.createdAt - a.createdAt;
  });
}

/**
 * The entries the list renders in display order, capped to `maxEntries` when given.
 * `maxEntries === undefined` returns every entry.
 */
export function selectVisibleLogs<T extends OrderableLogEntry>(
  entries: readonly T[],
  maxEntries: number | undefined
): T[] {
  const ordered = sortForDisplay(entries);
  return maxEntries === undefined ? ordered : ordered.slice(0, maxEntries);
}

/**
 * Whether `candidate` would sit beyond the first `maxEntries` in display order if it were
 * saved into `entries`. An entry in `entries` with the same `_id` is replaced by the candidate.
 * Use the candidate's real `createdAt` for an edit; for a new entry pass a `createdAt` that is
 * newer than every stored entry, so it wins ties on its day.
 */
export function isHiddenByCap(
  entries: readonly OrderableLogEntry[],
  candidate: OrderableLogEntry,
  maxEntries: number
): boolean {
  const others = entries.filter((entry) => entry._id !== candidate._id);
  const ordered = sortForDisplay([...others, candidate]);
  return ordered.findIndex((entry) => entry._id === candidate._id) >= maxEntries;
}
