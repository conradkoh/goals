import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { describe, expect, it } from 'vitest';

import { filterFocusedGoalsByInitiative } from './filter-focused-goals-by-initiative';

const INIT_A = 'init_a' as Id<'initiatives'>;
const INIT_B = 'init_b' as Id<'initiatives'>;

function makeItem(initiativeId?: Id<'initiatives'>): FocusedGoalItem {
  return {
    _id: 'goal1' as Id<'goals'>,
    title: 'Goal',
    isComplete: false,
    isAdhoc: false,
    year: 2026,
    quarter: 1,
    depth: 0,
    indentLevel: 0,
    breadcrumb: [],
    initiativeId,
  };
}

describe('filterFocusedGoalsByInitiative', () => {
  it('returns all goals when filter is null', () => {
    const goals = [makeItem(INIT_A), makeItem(INIT_B)];
    expect(filterFocusedGoalsByInitiative(goals, null)).toHaveLength(2);
  });

  it('filters to matching initiativeId', () => {
    const goals = [makeItem(INIT_A), makeItem(INIT_B), makeItem()];
    expect(filterFocusedGoalsByInitiative(goals, INIT_A)).toHaveLength(1);
    expect(filterFocusedGoalsByInitiative(goals, INIT_A)[0].initiativeId).toBe(INIT_A);
  });
});
