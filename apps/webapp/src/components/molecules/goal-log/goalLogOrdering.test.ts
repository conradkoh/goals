import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { dayKeyOf, isHiddenByCap, selectVisibleLogs } from './goalLogOrdering';

interface Entry {
  _id: string;
  logDate: number;
  createdAt: number;
}

/** An entry on March `day` 2026 at 09:00 local time. */
function entry(id: string, day: number, createdAt: number): Entry {
  return { _id: id, logDate: DateTime.local(2026, 3, day, 9).toMillis(), createdAt };
}

/** Base entries `log2`..`log7`: day N, createdAt N. */
function baseEntries(): Entry[] {
  return [2, 3, 4, 5, 6, 7].map((day) => entry(`log${day}`, day, day));
}

describe('dayKeyOf', () => {
  it('returns the local ISO date of the log date', () => {
    expect(dayKeyOf(DateTime.local(2026, 3, 9, 23).toMillis())).toBe('2026-03-09');
  });
});

describe('selectVisibleLogs', () => {
  it('orders by day descending, then createdAt descending, without mutating the input', () => {
    const a = entry('A', 10, 5);
    const b = entry('B', 10, 9);
    const c = entry('C', 9, 100);
    const input = [a, b, c];

    const ordered = selectVisibleLogs(input, undefined);

    expect(ordered.map((log) => log._id)).toEqual(['B', 'A', 'C']);
    expect(input.map((log) => log._id)).toEqual(['A', 'B', 'C']);
  });

  it('returns every entry in display order when maxEntries is undefined', () => {
    const ordered = selectVisibleLogs([entry('A', 10, 5), entry('C', 9, 100)], undefined);

    expect(ordered.map((log) => log._id)).toEqual(['A', 'C']);
  });

  it('returns the first maxEntries entries in display order', () => {
    const logs = [entry('A', 9, 100), entry('B', 10, 5), entry('C', 10, 9)];

    const visible = selectVisibleLogs(logs, 2);

    expect(visible.map((log) => log._id)).toEqual(['C', 'B']);
  });
});

describe('isHiddenByCap', () => {
  it('keeps a new entry on the 5th display day visible', () => {
    const candidate = entry('unsaved', 3, Number.MAX_SAFE_INTEGER);

    expect(isHiddenByCap(baseEntries(), candidate, 5)).toBe(false);
  });

  it('hides a new entry one day below the 5th display day', () => {
    const candidate = entry('unsaved', 2, Number.MAX_SAFE_INTEGER);

    expect(isHiddenByCap(baseEntries(), candidate, 5)).toBe(true);
  });

  it('hides a new entry well below the 5th display day', () => {
    const candidate = entry('unsaved', 1, Number.MAX_SAFE_INTEGER);

    expect(isHiddenByCap(baseEntries(), candidate, 5)).toBe(true);
  });

  it('keeps a new entry visible when the list is below the cap', () => {
    const belowCap = [entry('log1', 1, 1), entry('log2', 2, 2), entry('log3', 3, 3)];

    expect(isHiddenByCap(belowCap, entry('unsaved', 1, Number.MAX_SAFE_INTEGER), 5)).toBe(false);
  });

  it('hides an edited entry moved below the 5th display day', () => {
    const moved = entry('log7', 1, 7);

    expect(isHiddenByCap(baseEntries(), moved, 5)).toBe(true);
  });

  it('keeps an edited entry that stays in the capped view visible', () => {
    const unchanged = entry('log7', 7, 7);

    expect(isHiddenByCap(baseEntries(), unchanged, 5)).toBe(false);
  });
});
