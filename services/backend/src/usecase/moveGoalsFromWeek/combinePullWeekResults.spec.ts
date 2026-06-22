import { describe, expect, test } from 'vitest';

import {
  combineDryRunResults,
  combineUpdateResults,
  emptyDryRunResult,
  emptyUpdateResult,
} from './combinePullWeekResults';

describe('combinePullWeekResults', () => {
  test('combineDryRunResults merges canPull from either path', () => {
    const hierarchicalOnly = combineDryRunResults(
      {
        canPull: true,
        weekStatesToCopy: [{ title: 'Weekly', carryOver: {} as never, dailyGoalsCount: 0 }],
        dailyGoalsToMove: [],
        quarterlyGoalsToUpdate: [],
        skippedGoals: [],
      },
      { canPull: false, adhocGoalsToMove: [] }
    );

    expect(hierarchicalOnly.canPull).toBe(true);
    expect(hierarchicalOnly.isDryRun).toBe(true);
    expect(hierarchicalOnly.adhocGoalsToMove).toEqual([]);

    const adhocOnly = combineDryRunResults(
      {
        canPull: false,
        weekStatesToCopy: [],
        dailyGoalsToMove: [],
        quarterlyGoalsToUpdate: [],
        skippedGoals: [],
      },
      { canPull: true, adhocGoalsToMove: [{ id: 'g1' as never, title: 'Adhoc' }] }
    );

    expect(adhocOnly.canPull).toBe(true);
    expect(adhocOnly.adhocGoalsToMove).toHaveLength(1);
  });

  test('combineDryRunResults preserves skipped goals from hierarchical path', () => {
    const result = combineDryRunResults(
      {
        canPull: false,
        weekStatesToCopy: [],
        dailyGoalsToMove: [],
        quarterlyGoalsToUpdate: [],
        skippedGoals: [
          {
            id: 'g1' as never,
            title: 'Already moved',
            reason: 'already_moved',
            carryOver: {} as never,
            dailyGoalsCount: 0,
          },
        ],
      },
      { canPull: false, adhocGoalsToMove: [] }
    );

    expect(result.canPull).toBe(false);
    expect(result.skippedGoals).toHaveLength(1);
  });

  test('combineUpdateResults sums move counts from both paths', () => {
    const result = combineUpdateResults(
      {
        canPull: true,
        weekStatesToCopy: [],
        dailyGoalsToMove: [],
        quarterlyGoalsToUpdate: [],
        skippedGoals: [],
        weekStatesCopied: 2,
        dailyGoalsMoved: 3,
        quarterlyGoalsUpdated: 1,
      },
      {
        canPull: true,
        adhocGoalsToMove: [],
        adhocGoalsMoved: 4,
      }
    );

    expect(result).toEqual({
      weekStatesToCopy: [],
      dailyGoalsToMove: [],
      quarterlyGoalsToUpdate: [],
      adhocGoalsToMove: [],
      weekStatesCopied: 2,
      dailyGoalsMoved: 3,
      quarterlyGoalsUpdated: 1,
      adhocGoalsMoved: 4,
    });
  });

  test('empty results', () => {
    expect(emptyDryRunResult()).toEqual({
      isDryRun: true,
      canPull: false,
      weekStatesToCopy: [],
      dailyGoalsToMove: [],
      quarterlyGoalsToUpdate: [],
      adhocGoalsToMove: [],
      skippedGoals: [],
    });

    expect(emptyUpdateResult()).toEqual({
      weekStatesToCopy: [],
      dailyGoalsToMove: [],
      quarterlyGoalsToUpdate: [],
      adhocGoalsToMove: [],
      weekStatesCopied: 0,
      dailyGoalsMoved: 0,
      quarterlyGoalsUpdated: 0,
      adhocGoalsMoved: 0,
    });
  });
});
