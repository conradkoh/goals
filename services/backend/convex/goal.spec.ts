import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';
import { DayOfWeek } from '../src/constants';
import type { GoalWithDetailsAndChildren } from '../src/usecase/getWeekDetails';
import { convexTest } from '../src/util/test';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

/**
 * Helper to create a test session using the template's loginAnon pattern.
 * Generates a UUID sessionId and calls loginAnon to create the session.
 */
const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

// Define the test context type based on the return value of convexTest
type TestCtx = ReturnType<typeof convexTest>;

// Assuming these are the correct depth values based on the original test
enum GoalDepth {
  Quarterly = 'quarterly',
  Weekly = 'weekly',
  Daily = 'daily',
}

// Helper to create a mock goal based on depth
const createMockGoal = async (
  ctx: TestCtx,
  sessionId: SessionId,
  depth: GoalDepth,
  parentId?: Id<'goals'>,
  _isComplete = false
) => {
  if (depth === GoalDepth.Quarterly) {
    return await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: `Goal ${depth}`,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
  }
  if (depth === GoalDepth.Weekly) {
    if (!parentId) {
      throw new Error('Weekly goal requires a parent quarterly goal');
    }
    return await ctx.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: `Goal ${depth}`,
      parentId,
      weekNumber: 1,
    });
  }
  if (!parentId) {
    throw new Error('Daily goal requires a parent weekly goal');
  }
  return await ctx.mutation(api.dashboard.createDailyGoal, {
    sessionId,
    title: `Goal ${depth}`,
    parentId,
    weekNumber: 1,
    dayOfWeek: DayOfWeek.MONDAY,
  });
};

describe('moveGoalsFromWeek', () => {
  test('basic move with starred and pinned states', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create test data
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);
    const dailyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoalId);

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
      weekStatesToCopy: [
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
      adhocGoalsToMove: [],
      skippedGoals: [],
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
      weekStatesToCopy: expect.any(Array),
      dailyGoalsToMove: expect.any(Array),
      quarterlyGoalsToUpdate: expect.any(Array),
      adhocGoalsToMove: expect.any(Array),
      weekStatesCopied: 1,
      dailyGoalsMoved: 1,
      quarterlyGoalsUpdated: 1,
      adhocGoalsMoved: 0,
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
      (g: GoalWithDetailsAndChildren) => g._id === quarterlyGoalId
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
    const sessionId = await createTestSession(ctx);

    // Test Case 1: Moving a pinned quarterly goal
    const pinnedQuarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
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
    const starredQuarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
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
    await ctx.mutation(api.goal.moveGoalsFromWeek, {
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
      (g: GoalWithDetailsAndChildren) => g._id === pinnedQuarterlyGoalId
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
      (g: GoalWithDetailsAndChildren) => g._id === starredQuarterlyGoalId
    );
    expect(movedStarredGoal?.state).toEqual(
      expect.objectContaining({
        weekNumber: 2,
        isStarred: true,
        isPinned: false,
      })
    );
  });

  test('fire goal status is preserved during carry-over', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create test data
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Set the weekly goal as a fire goal
    await ctx.mutation(api.fireGoal.toggleFireStatus, {
      sessionId,
      goalId: weeklyGoalId,
    });

    // Verify the goal is on fire
    const fireGoalsBefore = await ctx.query(api.fireGoal.getFireGoals, {
      sessionId,
    });
    expect(fireGoalsBefore).toContain(weeklyGoalId);

    // Move goals from week 1 to week 2
    const moveResult = await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: false,
    });

    expect(moveResult.weekStatesCopied).toBe(1);

    // Get the goals in week 2
    const weekTwoGoals = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 2,
    });

    // Find the carried over weekly goal
    const quarterlyGoal = weekTwoGoals.tree.quarterlyGoals.find(
      (qg: GoalWithDetailsAndChildren) => qg._id === quarterlyGoalId
    );
    const carriedOverWeeklyGoal = quarterlyGoal?.children.find(
      (wg: GoalWithDetailsAndChildren) => wg.carryOver?.fromGoal.previousGoalId === weeklyGoalId
    );

    expect(carriedOverWeeklyGoal).toBeDefined();
    expect(carriedOverWeeklyGoal?._id).toBeDefined();

    // Verify the carried over goal is still on fire
    const fireGoalsAfter = await ctx.query(api.fireGoal.getFireGoals, {
      sessionId,
    });
    expect(fireGoalsAfter).toContain(carriedOverWeeklyGoal?._id);
    expect(fireGoalsAfter).toHaveLength(1); // Should only have the new goal, not the old one
  });
});

describe('moveGoalsFromDay', () => {
  test('moving incomplete daily goals from one day to another', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create test data
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Create a daily goal for Monday
    const mondayGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Monday task',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    // Create a completed daily goal for Monday
    const completedMondayGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Completed Monday task',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    // Mark the second goal as complete
    await ctx.mutation(api.dashboard.toggleGoalCompletion, {
      sessionId,
      goalId: completedMondayGoalId,
      weekNumber: 1,
      isComplete: true,
    });

    // Test dry run preview
    const previewResult = await ctx.mutation(api.goal.moveGoalsFromDay, {
      sessionId,
      from: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.MONDAY,
      },
      to: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.TUESDAY,
      },
      dryRun: true,
    });

    // Verify that only the incomplete goal is in the preview
    expect(previewResult.canMove).toBe(true);
    expect(previewResult.tasks?.length).toBe(1);
    expect(previewResult.tasks?.[0].title).toBe('Monday task');

    // Test the actual move
    const moveResult = await ctx.mutation(api.goal.moveGoalsFromDay, {
      sessionId,
      from: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.MONDAY,
      },
      to: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.TUESDAY,
      },
      dryRun: false,
    });

    expect(moveResult.tasksMoved).toBe(1);

    // Verify the task was moved to Tuesday
    const movedTask = await ctx.query(api.dashboard.useDailyGoal, {
      sessionId,
      goalId: mondayGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.TUESDAY,
    });

    expect(movedTask).not.toBeNull();
    expect(movedTask?.title).toBe('Monday task');

    // Verify the completed task is still on Monday
    const completedTask = await ctx.query(api.dashboard.useDailyGoal, {
      sessionId,
      goalId: completedMondayGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    expect(completedTask).not.toBeNull();
    expect(completedTask?.title).toBe('Completed Monday task');
  });

  test('moving daily goals to a different week', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create test data
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Create a daily goal for Monday in week 1
    const mondayGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Week 1 Monday task',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    // Test moving to week 2 Tuesday
    const moveResult = await ctx.mutation(api.goal.moveGoalsFromDay, {
      sessionId,
      from: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.MONDAY,
      },
      to: {
        year: 2024,
        quarter: 1,
        weekNumber: 2,
        dayOfWeek: DayOfWeek.TUESDAY,
      },
      dryRun: false,
    });

    expect(moveResult.tasksMoved).toBe(1);

    // Verify the task was moved to week 2 Tuesday
    const movedTask = await ctx.query(api.dashboard.useDailyGoal, {
      sessionId,
      goalId: mondayGoalId,
      weekNumber: 2,
      dayOfWeek: DayOfWeek.TUESDAY,
    });

    expect(movedTask).not.toBeNull();
    expect(movedTask?.title).toBe('Week 1 Monday task');
    expect(movedTask?.weekNumber).toBe(2);
    expect(movedTask?.dayOfWeek).toBe(DayOfWeek.TUESDAY);
  });

  test('move all goals including completed ones', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create test data
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Create a daily goal for Wednesday
    const wednesdayGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Wednesday task',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.WEDNESDAY,
    });

    // Create a completed daily goal for Wednesday
    const completedWednesdayGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Completed Wednesday task',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.WEDNESDAY,
    });

    // Mark the second goal as complete
    await ctx.mutation(api.dashboard.toggleGoalCompletion, {
      sessionId,
      goalId: completedWednesdayGoalId,
      weekNumber: 1,
      isComplete: true,
    });

    // Test moving all goals, including completed ones
    const moveResult = await ctx.mutation(api.goal.moveGoalsFromDay, {
      sessionId,
      from: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.WEDNESDAY,
      },
      to: {
        year: 2024,
        quarter: 1,
        weekNumber: 1,
        dayOfWeek: DayOfWeek.THURSDAY,
      },
      dryRun: false,
      moveOnlyIncomplete: false,
    });

    expect(moveResult.tasksMoved).toBe(2);

    // Verify both tasks were moved to Thursday
    const movedTask1 = await ctx.query(api.dashboard.useDailyGoal, {
      sessionId,
      goalId: wednesdayGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.THURSDAY,
    });

    const movedTask2 = await ctx.query(api.dashboard.useDailyGoal, {
      sessionId,
      goalId: completedWednesdayGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.THURSDAY,
    });

    expect(movedTask1).not.toBeNull();
    expect(movedTask2).not.toBeNull();
    expect(movedTask1?.title).toBe('Wednesday task');
    expect(movedTask2?.title).toBe('Completed Wednesday task');
    expect(movedTask2?.isComplete).toBe(true);
  });
});

describe('deleteGoal', () => {
  test('should delete a goal and its children', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create two quarterly goals
    const quarterlyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    const quarterlyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Create a weekly goal under the first quarterly goal
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoal1Id);

    // Delete the first quarterly goal (should delete its child)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first quarterly goal and its child have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the second quarterly goal still exists
    // by successfully deleting it
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);

    // Verify that the second quarterly goal has been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle sibling paths correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create a quarterly goal
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Create two weekly goals under the quarterly goal
    const weeklyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    const weeklyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Create daily goals under each weekly goal
    const dailyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal1Id);

    const dailyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal2Id);

    // Delete the first weekly goal (should delete its child)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).resolves.toEqual(weeklyGoal1Id);

    // Verify that the first weekly goal and its child have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the second weekly goal and its child still exist
    // by successfully getting the week data
    const weekData = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Check if weeklyGoal2Id exists in the tree
    const weeklyGoal2Exists = weekData.tree.allGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === weeklyGoal2Id
    );
    expect(weeklyGoal2Exists).toBe(true);

    // Delete the quarterly goal (should delete all remaining children)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all remaining goals have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle path comparison with similar prefixes', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create two quarterly goals (both with inPath = "/")
    const quarterlyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    const quarterlyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Create weekly goals under each quarterly goal
    const weeklyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoal1Id);

    const weeklyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoal2Id);

    // Create daily goals under each weekly goal
    const dailyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal1Id);

    const dailyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal2Id);

    // Delete the first quarterly goal (should delete all its children)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first quarterly goal and its children have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the second quarterly goal and its children still exist
    // by successfully getting the week data
    const weekData = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Check if quarterlyGoal2Id exists in the tree
    const quarterlyGoal2Exists = weekData.tree.quarterlyGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === quarterlyGoal2Id
    );
    expect(quarterlyGoal2Exists).toBe(true);

    // Delete the second quarterly goal (should delete all its children)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);

    // Verify that the second quarterly goal and its children have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle deep hierarchies correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create a deep hierarchy of goals
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    const weeklyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    const dailyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal1Id);

    const weeklyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    const dailyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoal2Id);

    const weeklyGoal3Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Delete the quarterly goal (should delete all children)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all goals have been deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal3Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should not delete goals with similar IDs but different paths', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create two separate hierarchies
    // First hierarchy
    const quarterlyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    const weeklyGoal1Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoal1Id);

    // Second hierarchy
    const quarterlyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    const weeklyGoal2Id = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoal2Id);

    // Delete the first quarterly goal
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first hierarchy goals are deleted
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the second hierarchy is still intact
    // by successfully getting the week data
    const weekData = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Check if quarterlyGoal2Id exists in the tree
    const quarterlyGoal2Exists = weekData.tree.quarterlyGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === quarterlyGoal2Id
    );
    expect(quarterlyGoal2Exists).toBe(true);

    // Check if weeklyGoal2Id exists in the tree
    const weeklyGoal2Exists = weekData.tree.allGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === weeklyGoal2Id
    );
    expect(weeklyGoal2Exists).toBe(true);

    // Successfully delete the second hierarchy goals to confirm they exist
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).resolves.toEqual(weeklyGoal2Id);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);
  });

  test('should not delete goals from other users', async () => {
    const ctx = convexTest(schema);

    // Create two different user sessions
    const sessionId1 = await createTestSession(ctx);
    const sessionId2 = await createTestSession(ctx);

    // Create goals for user 1
    const user1QuarterlyGoalId = await createMockGoal(ctx, sessionId1, GoalDepth.Quarterly);

    await createMockGoal(ctx, sessionId1, GoalDepth.Weekly, user1QuarterlyGoalId);

    // Create goals for user 2
    const user2QuarterlyGoalId = await createMockGoal(ctx, sessionId2, GoalDepth.Quarterly);

    await createMockGoal(ctx, sessionId2, GoalDepth.Weekly, user2QuarterlyGoalId);

    // User 2 tries to delete user 1's goal (should fail with unauthorized)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId: sessionId2,
        goalId: user1QuarterlyGoalId,
      })
    ).rejects.toThrow(/You do not have permission/);

    // User 1 tries to delete user 2's goal (should fail with unauthorized)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId: sessionId1,
        goalId: user2QuarterlyGoalId,
      })
    ).rejects.toThrow(/You do not have permission/);

    // Verify that user 1's goals still exist
    const user1WeekData = await ctx.query(api.dashboard.getWeek, {
      sessionId: sessionId1,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const user1QuarterlyGoalExists = user1WeekData.tree.quarterlyGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === user1QuarterlyGoalId
    );
    expect(user1QuarterlyGoalExists).toBe(true);

    // Verify that user 2's goals still exist
    const user2WeekData = await ctx.query(api.dashboard.getWeek, {
      sessionId: sessionId2,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const user2QuarterlyGoalExists = user2WeekData.tree.quarterlyGoals.some(
      // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
      (goal: any) => goal._id === user2QuarterlyGoalId
    );
    expect(user2QuarterlyGoalExists).toBe(true);

    // Each user can delete their own goals
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId: sessionId1,
        goalId: user1QuarterlyGoalId,
      })
    ).resolves.toEqual(user1QuarterlyGoalId);

    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId: sessionId2,
        goalId: user2QuarterlyGoalId,
      })
    ).resolves.toEqual(user2QuarterlyGoalId);
  });

  test('should not delete goals from different quarters or years', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create a goal in quarter 1
    const quarter1GoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarter 1 Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Create a goal in quarter 2
    const quarter2GoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarter 2 Goal',
      year: 2024,
      quarter: 2,
      weekNumber: 1,
    });

    // Create a goal in a different year
    const nextYearGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Next Year Goal',
      year: 2025,
      quarter: 1,
      weekNumber: 1,
    });

    // Delete the quarter 1 goal
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarter1GoalId,
      })
    ).resolves.toEqual(quarter1GoalId);

    // Verify that the quarter 2 goal still exists by successfully deleting it
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: quarter2GoalId,
      })
    ).resolves.toEqual(quarter2GoalId);

    // Verify that the next year goal still exists by successfully deleting it
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId: nextYearGoalId,
      })
    ).resolves.toEqual(nextYearGoalId);
  });

  test('should handle non-existent goals gracefully', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create a real goal first
    const goalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Delete it
    await ctx.mutation(api.goal.deleteGoal, {
      sessionId,
      goalId,
    });

    // Try to delete it again (should fail with Goal not found)
    await expect(
      ctx.mutation(api.goal.deleteGoal, {
        sessionId,
        goalId,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('dryRun should return a preview of goals to be deleted', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    // Create a quarterly goal
    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Create a weekly goal under the quarterly goal
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);

    // Create daily goals under the weekly goal
    await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoalId);
    await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoalId);

    // Test deleting the weekly goal with dryRun
    const result = (await ctx.mutation(api.goal.deleteGoal, {
      sessionId,
      goalId: weeklyGoalId,
      dryRun: true,
    })) as {
      isDryRun: boolean;
      goalsToDelete: Array<{
        _id: Id<'goals'>;
        title: string;
        depth: number;
        // biome-ignore lint/suspicious/noExplicitAny: Test code with dynamic goal types
        children: any[];
      }>;
    };

    // Verify the result
    expect(result).toHaveProperty('isDryRun', true);
    expect(result.goalsToDelete).toHaveLength(1);

    const weeklyGoalPreview = result.goalsToDelete[0];
    expect(weeklyGoalPreview.title).toBe('Goal weekly');
    expect(weeklyGoalPreview.depth).toBe(1);
    expect(weeklyGoalPreview.children).toHaveLength(2);

    // Now test actual deletion
    await ctx.mutation(api.goal.deleteGoal, {
      sessionId,
      goalId: weeklyGoalId,
    });

    // Verify that the weekly goal and its children are deleted
    // We can do this by trying to fetch the week details and checking that the goals are gone
    const weekDetails = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // The quarterly goal should still exist
    const quarterlyGoals = weekDetails.tree.quarterlyGoals;
    expect(quarterlyGoals.length).toBe(1);
    expect(quarterlyGoals[0]._id).toBe(quarterlyGoalId);

    // But the weekly goal and its children should be gone
    const weeklyGoals = quarterlyGoals[0].children;
    expect(weeklyGoals.length).toBe(0);
  });
});
