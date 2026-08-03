import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import { resolveWeekNumberForParent } from './resolve-week-number-for-parent';

function makeGoal(overrides: Partial<Doc<'goals'>>): Doc<'goals'> {
  return {
    _id: 'goal1' as Doc<'goals'>['_id'],
    _creationTime: 0,
    userId: 'user1' as Doc<'goals'>['userId'],
    year: 2026,
    quarter: 1,
    title: 'Goal',
    inPath: '/',
    depth: 0,
    isComplete: false,
    ...overrides,
  } as Doc<'goals'>;
}

describe('resolveWeekNumberForParent', () => {
  it('uses the focus week number when parent is in the focus year and quarter', () => {
    const parent = makeGoal({ year: 2026, quarter: 1 });
    expect(resolveWeekNumberForParent(parent, 2026, 1, 3)).toBe(3);
  });

  it('uses the first week of the parent quarter when parent is in another quarter', () => {
    const parent = makeGoal({ year: 2026, quarter: 3 });
    expect(resolveWeekNumberForParent(parent, 2026, 1, 3)).toBe(27);
  });

  it('uses the first week of the parent quarter when parent is in another year', () => {
    const parent = makeGoal({ year: 2025, quarter: 4 });
    expect(resolveWeekNumberForParent(parent, 2026, 1, 3)).toBe(40);
  });
});
