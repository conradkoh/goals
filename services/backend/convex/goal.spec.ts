import { convexTest } from '../src/util/test';
import { test, expect, describe } from 'vitest';
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

// Helper to create a mock goal based on depth
const createMockGoal = async (
  ctx: any,
  sessionId: Id<'sessions'>,
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

describe('moveGoalsFromWeek', () => {
  test('basic move with starred and pinned states', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create test data
    const quarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );
    const weeklyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );
    const dailyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoalId
    );

    // Set the quarterly goal as starred (which should take precedence over pinned)
    await ctx.mutation(api.dashboard.updateQuarterlyGoalStatus, {
      sessionId,
      goalId: quarterlyGoalId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
      isStarred: true,
      isPinned: true, // This should be ignored since isStarred is true
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
          isPinned: false, // Should be false since isStarred is true
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

    // Verify the moved goals are in the correct state
    const movedQuarterlyGoal = weekTwoGoals.tree.quarterlyGoals.find(
      (g) => g._id === quarterlyGoalId
    );
    expect(movedQuarterlyGoal?.state).toEqual(
      expect.objectContaining({
        weekNumber: 2,
        isStarred: true,
        isPinned: false, // Should be false since isStarred is true
      })
    );
  });

  test('pinned/starred state precedence', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Test Case 1: Moving a pinned quarterly goal
    const pinnedQuarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );
    await ctx.mutation(api.dashboard.updateQuarterlyGoalStatus, {
      sessionId,
      goalId: pinnedQuarterlyGoalId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
      isStarred: false,
      isPinned: true,
    });

    // Test Case 2: Moving a starred quarterly goal
    const starredQuarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );
    await ctx.mutation(api.dashboard.updateQuarterlyGoalStatus, {
      sessionId,
      goalId: starredQuarterlyGoalId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
      isStarred: true,
      isPinned: false,
    });

    // Create weekly and daily goals for both quarterly goals
    const pinnedWeeklyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      pinnedQuarterlyGoalId
    );
    const starredWeeklyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      starredQuarterlyGoalId
    );
    await createMockGoal(ctx, sessionId, GoalDepth.Daily, pinnedWeeklyGoalId);
    await createMockGoal(ctx, sessionId, GoalDepth.Daily, starredWeeklyGoalId);

    // Test Case 3: Set up a goal that's already starred in week 2
    await ctx.mutation(api.dashboard.updateQuarterlyGoalStatus, {
      sessionId,
      goalId: pinnedQuarterlyGoalId,
      year: 2024,
      quarter: 1,
      weekNumber: 2,
      isStarred: true,
      isPinned: false,
    });

    // Move goals from week 1 to week 2
    const moveResult = await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: false,
    });

    // Verify the state after move
    const weekTwoGoals = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 2,
    });

    // Test Case 1: Verify pinned goal state
    const movedPinnedGoal = weekTwoGoals.tree.quarterlyGoals.find(
      (g) => g._id === pinnedQuarterlyGoalId
    );
    // Should retain starred state from week 2, ignoring pinned state from week 1
    expect(movedPinnedGoal?.state).toEqual(
      expect.objectContaining({
        weekNumber: 2,
        isStarred: true,
        isPinned: false,
      })
    );

    // Test Case 2: Verify starred goal state
    const movedStarredGoal = weekTwoGoals.tree.quarterlyGoals.find(
      (g) => g._id === starredQuarterlyGoalId
    );
    expect(movedStarredGoal?.state).toEqual(
      expect.objectContaining({
        weekNumber: 2,
        isStarred: true,
        isPinned: false,
      })
    );
  });
});
