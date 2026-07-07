import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { filterInitiativesForFocusView, getInitiativesForBrowse } from './initiative-focus-filters';

const now = DateTime.fromObject({ year: 2026, month: 7, day: 6, hour: 12 });

function makeInitiative(
  overrides: Partial<Doc<'initiatives'>> & Pick<Doc<'initiatives'>, 'title' | 'startDate'>
): Doc<'initiatives'> {
  return {
    _id: 'initiatives:test' as Doc<'initiatives'>['_id'],
    _creationTime: 0,
    userId: 'users:test' as Doc<'initiatives'>['userId'],
    endDate: undefined,
    description: undefined,
    ...overrides,
  };
}

describe('filterInitiativesForFocusView', () => {
  it('includes active and upcoming initiatives', () => {
    const active = makeInitiative({
      _id: 'initiatives:active' as Doc<'initiatives'>['_id'],
      title: 'Active',
      startDate: now.minus({ days: 10 }).toMillis(),
    });
    const upcoming = makeInitiative({
      _id: 'initiatives:upcoming' as Doc<'initiatives'>['_id'],
      title: 'Upcoming',
      startDate: now.plus({ days: 5 }).toMillis(),
    });
    const ended = makeInitiative({
      _id: 'initiatives:ended' as Doc<'initiatives'>['_id'],
      title: 'Ended',
      startDate: now.minus({ months: 3 }).toMillis(),
      endDate: now.minus({ days: 1 }).endOf('day').toMillis(),
    });

    const result = filterInitiativesForFocusView([active, upcoming, ended], now);
    expect(result.map((i) => i.title)).toEqual(['Active', 'Upcoming']);
  });
});

describe('getInitiativesForBrowse', () => {
  it('uses recent window when query is empty', () => {
    const recent = makeInitiative({
      _id: 'initiatives:recent' as Doc<'initiatives'>['_id'],
      title: 'Recent',
      startDate: now.minus({ months: 2 }).toMillis(),
    });
    const old = makeInitiative({
      _id: 'initiatives:old' as Doc<'initiatives'>['_id'],
      title: 'Ancient',
      startDate: now.minus({ years: 3 }).toMillis(),
      endDate: now.minus({ years: 2 }).endOf('day').toMillis(),
    });
    expect(getInitiativesForBrowse([recent, old], '', now).map((i) => i.title)).toEqual(['Recent']);
  });

  it('searches full list when query is non-empty', () => {
    const old = makeInitiative({
      _id: 'initiatives:old' as Doc<'initiatives'>['_id'],
      title: 'Ancient Project',
      startDate: now.minus({ years: 3 }).toMillis(),
      endDate: now.minus({ years: 2 }).endOf('day').toMillis(),
    });
    expect(getInitiativesForBrowse([old], 'ancient', now).map((i) => i.title)).toEqual([
      'Ancient Project',
    ]);
  });

  it('excludes initiatives that ended before the recent window when query is empty', () => {
    const old = makeInitiative({
      _id: 'initiatives:old' as Doc<'initiatives'>['_id'],
      title: 'Too old',
      startDate: now.minus({ years: 2 }).toMillis(),
      endDate: now.minus({ months: 8 }).endOf('day').toMillis(),
    });
    const recent = makeInitiative({
      _id: 'initiatives:recent' as Doc<'initiatives'>['_id'],
      title: 'Recent ended',
      startDate: now.minus({ months: 4 }).toMillis(),
      endDate: now.minus({ months: 1 }).endOf('day').toMillis(),
    });
    expect(getInitiativesForBrowse([old, recent], '', now).map((i) => i.title)).toEqual([
      'Recent ended',
    ]);
  });

  it('matches case-insensitively on title when query is non-empty', () => {
    const a = makeInitiative({
      _id: 'initiatives:a' as Doc<'initiatives'>['_id'],
      title: 'Launch Q3',
      startDate: 0,
    });
    const b = makeInitiative({
      _id: 'initiatives:b' as Doc<'initiatives'>['_id'],
      title: 'Other',
      startDate: 0,
    });
    expect(getInitiativesForBrowse([a, b], 'launch', now).map((i) => i.title)).toEqual([
      'Launch Q3',
    ]);
  });
});
