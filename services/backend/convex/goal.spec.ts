import { convexTest } from '../src/util/test';
import { test, expect } from 'vitest';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';
import { DayOfWeek } from '../src/constants';
import schema from './schema';

// Assuming these are the correct depth values based on the original test
enum GoalDepth {
  Quarterly = 'quarterly',
  Weekly = 'weekly',
  Daily = 'daily',
}

test('moveGoalsFromWeek', async () => {
  const ctx = convexTest(schema);

  // Create a test session first
  const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

  // Helper to create a mock goal based on depth
  const createMockGoal = async (
    depth: GoalDepth,
    parentId?: Id<'goals'>,
    isComplete = false
  ) => {
    if (depth === GoalDepth.Quarterly) {
      return await ctx.mutation(api.dashboard.createQuarterlyGoal, {
        sessionId,
        title: `Goal ${depth}`,
        year: 2024,
        quarter: 1,
        weekNumber: 1,
      });
    } else if (depth === GoalDepth.Weekly) {
      return await ctx.mutation(api.dashboard.createWeeklyGoal, {
        sessionId,
        title: `Goal ${depth}`,
        parentId: parentId!,
        weekNumber: 1,
      });
    } else {
      return await ctx.mutation(api.dashboard.createDailyGoal, {
        sessionId,
        title: `Goal ${depth}`,
        parentId: parentId!,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.MONDAY,
      });
    }
  };

  // Create test data
  const quarterlyGoalId = await createMockGoal(GoalDepth.Quarterly);
  const weeklyGoalId = await createMockGoal(GoalDepth.Weekly, quarterlyGoalId);
  const dailyGoalId = await createMockGoal(GoalDepth.Daily, weeklyGoalId);

  // Set the quarterly goal as starred and pinned
  await ctx.mutation(api.dashboard.updateQuarterlyGoalStatus, {
    sessionId,
    goalId: quarterlyGoalId,
    year: 2024,
    quarter: 1,
    weekNumber: 1,
    isStarred: true,
    isPinned: true,
  });

  // Test dry run preview
  const previewResult = await ctx.mutation(api.goal.moveGoalsFromWeek, {
    sessionId,
    from: { year: 2024, quarter: 1, weekNumber: 1 },
    to: { year: 2024, quarter: 1, weekNumber: 2 },
    dryRun: true,
  });

  // Verify preview results
  expect(previewResult).toEqual({
    canPull: true,
    isDryRun: true,
    weeklyGoalsToCopy: [
      {
        title: 'Goal weekly',
        carryOver: {
          type: 'week',
          numWeeks: 1,
          fromGoal: {
            previousGoalId: weeklyGoalId,
            rootGoalId: weeklyGoalId,
          },
        },
        dailyGoalsCount: 1,
        quarterlyGoalId,
      },
    ],
    dailyGoalsToMove: [
      {
        id: dailyGoalId,
        title: 'Goal daily',
        weeklyGoalId,
        weeklyGoalTitle: 'Goal weekly',
        quarterlyGoalId,
        quarterlyGoalTitle: 'Goal quarterly',
      },
    ],
    quarterlyGoalsToUpdate: [
      {
        id: quarterlyGoalId,
        title: 'Goal quarterly',
        isStarred: true,
        isPinned: true,
      },
    ],
  });

  // Test actual move
  const moveResult = await ctx.mutation(api.goal.moveGoalsFromWeek, {
    sessionId,
    from: { year: 2024, quarter: 1, weekNumber: 1 },
    to: { year: 2024, quarter: 1, weekNumber: 2 },
    dryRun: false,
  });

  // Verify move results
  expect(moveResult).toEqual({
    weeklyGoalsToCopy: expect.any(Array),
    dailyGoalsToMove: expect.any(Array),
    quarterlyGoalsToUpdate: expect.any(Array),
    weeklyGoalsCopied: 1,
    dailyGoalsMoved: 1,
    quarterlyGoalsUpdated: 1,
  });

  // Verify the state after move
  const weekTwoGoals = await ctx.query(api.dashboard.getWeek, {
    sessionId,
    year: 2024,
    quarter: 1,
    weekNumber: 2,
  });

  // Add assertions to verify the moved goals are in the correct state
  const movedQuarterlyGoal = weekTwoGoals.tree.quarterlyGoals.find(
    (g) => g._id === quarterlyGoalId
  );
  expect(movedQuarterlyGoal?.state).toEqual(
    expect.objectContaining({
      weekNumber: 2,
      isStarred: true,
      isPinned: true,
    })
  );
});
