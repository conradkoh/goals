import { convexTest } from '../src/util/test';
import { test, expect, describe } from 'vitest';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';
import { DayOfWeek } from '../src/constants';
import schema from './schema';

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

describe('deleteGoal', () => {
  test('should delete a goal and all its children', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a hierarchy of goals
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

    // Delete the quarterly goal (should delete all children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all goals have been deleted by trying to delete them again
    // This should fail with a "Goal not found" error
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle path comparison for nested goals correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a deeper hierarchy of goals
    const quarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    // Create multiple weekly goals under the quarterly goal
    const weeklyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    const weeklyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    // Create daily goals under the weekly goals
    const dailyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal1Id
    );

    const dailyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal2Id
    );

    // Delete the first weekly goal (should delete its child)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).resolves.toEqual(weeklyGoal1Id);

    // Verify that the weekly goal and its child have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the other weekly goal and its child still exist
    // by successfully getting the week data
    const weekData = await ctx.query(api.dashboard.getWeek, {
      sessionId,
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Check if weeklyGoal2Id exists in the tree
    const weeklyGoal2Exists = weekData.tree.allGoals.some(
      (goal: any) => goal._id === weeklyGoal2Id
    );
    expect(weeklyGoal2Exists).toBe(true);

    // Delete the quarterly goal (should delete all remaining children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all remaining goals have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle root path comparison correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create multiple quarterly goals (root goals with inPath = "/")
    const quarterlyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    const quarterlyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    // Create a weekly goal under the first quarterly goal
    const weeklyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoal1Id
    );

    // Delete the first quarterly goal (should delete its child)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first quarterly goal and its child have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    // Verify that the second quarterly goal still exists
    // by successfully deleting it
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);

    // Verify that the second quarterly goal has been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle sibling paths correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a quarterly goal
    const quarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    // Create two weekly goals under the quarterly goal
    const weeklyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    const weeklyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    // Create daily goals under each weekly goal
    const dailyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal1Id
    );

    const dailyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal2Id
    );

    // Delete the first weekly goal (should delete its child)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).resolves.toEqual(weeklyGoal1Id);

    // Verify that the first weekly goal and its child have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
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
      (goal: any) => goal._id === weeklyGoal2Id
    );
    expect(weeklyGoal2Exists).toBe(true);

    // Delete the quarterly goal (should delete all remaining children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all remaining goals have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle path comparison with similar prefixes', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create two quarterly goals (both with inPath = "/")
    const quarterlyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    const quarterlyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    // Create weekly goals under each quarterly goal
    const weeklyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoal1Id
    );

    const weeklyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoal2Id
    );

    // Create daily goals under each weekly goal
    const dailyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal1Id
    );

    const dailyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal2Id
    );

    // Delete the first quarterly goal (should delete all its children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first quarterly goal and its children have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
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
      (goal: any) => goal._id === quarterlyGoal2Id
    );
    expect(quarterlyGoal2Exists).toBe(true);

    // Delete the second quarterly goal (should delete all its children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);

    // Verify that the second quarterly goal and its children have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should handle deep hierarchies correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a deep hierarchy of goals
    const quarterlyGoalId = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    const weeklyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    const dailyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal1Id
    );

    const weeklyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    const dailyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Daily,
      weeklyGoal2Id
    );

    const weeklyGoal3Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoalId
    );

    // Delete the quarterly goal (should delete all children)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).resolves.toEqual(quarterlyGoalId);

    // Verify that all goals have been deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoalId,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: dailyGoal2Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal3Id,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should not delete goals with similar IDs but different paths', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create two separate hierarchies
    // First hierarchy
    const quarterlyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    const weeklyGoal1Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoal1Id
    );

    // Second hierarchy
    const quarterlyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Quarterly
    );

    const weeklyGoal2Id = await createMockGoal(
      ctx,
      sessionId,
      GoalDepth.Weekly,
      quarterlyGoal2Id
    );

    // Delete the first quarterly goal
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).resolves.toEqual(quarterlyGoal1Id);

    // Verify that the first hierarchy goals are deleted
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal1Id,
      })
    ).rejects.toThrow(/Goal not found/);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
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
      (goal: any) => goal._id === quarterlyGoal2Id
    );
    expect(quarterlyGoal2Exists).toBe(true);

    // Check if weeklyGoal2Id exists in the tree
    const weeklyGoal2Exists = weekData.tree.allGoals.some(
      (goal: any) => goal._id === weeklyGoal2Id
    );
    expect(weeklyGoal2Exists).toBe(true);

    // Successfully delete the second hierarchy goals to confirm they exist
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: weeklyGoal2Id,
      })
    ).resolves.toEqual(weeklyGoal2Id);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarterlyGoal2Id,
      })
    ).resolves.toEqual(quarterlyGoal2Id);
  });

  test('should not delete goals from other users', async () => {
    const ctx = convexTest(schema);

    // Create two different user sessions
    const sessionId1 = await ctx.mutation(api.auth.useAnonymousSession, {});
    const sessionId2 = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create goals for user 1
    const user1QuarterlyGoalId = await createMockGoal(
      ctx,
      sessionId1,
      GoalDepth.Quarterly
    );

    const user1WeeklyGoalId = await createMockGoal(
      ctx,
      sessionId1,
      GoalDepth.Weekly,
      user1QuarterlyGoalId
    );

    // Create goals for user 2
    const user2QuarterlyGoalId = await createMockGoal(
      ctx,
      sessionId2,
      GoalDepth.Quarterly
    );

    const user2WeeklyGoalId = await createMockGoal(
      ctx,
      sessionId2,
      GoalDepth.Weekly,
      user2QuarterlyGoalId
    );

    // User 2 tries to delete user 1's goal (should fail with unauthorized)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId: sessionId2,
        goalId: user1QuarterlyGoalId,
      })
    ).rejects.toThrow(/You do not have permission/);

    // User 1 tries to delete user 2's goal (should fail with unauthorized)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
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
      (goal: any) => goal._id === user2QuarterlyGoalId
    );
    expect(user2QuarterlyGoalExists).toBe(true);

    // Each user can delete their own goals
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId: sessionId1,
        goalId: user1QuarterlyGoalId,
      })
    ).resolves.toEqual(user1QuarterlyGoalId);

    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId: sessionId2,
        goalId: user2QuarterlyGoalId,
      })
    ).resolves.toEqual(user2QuarterlyGoalId);
  });

  test('should not delete goals from different quarters or years', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a goal in quarter 1
    const quarter1GoalId = await ctx.mutation(
      api.dashboard.createQuarterlyGoal,
      {
        sessionId,
        title: 'Quarter 1 Goal',
        year: 2024,
        quarter: 1,
        weekNumber: 1,
      }
    );

    // Create a goal in quarter 2
    const quarter2GoalId = await ctx.mutation(
      api.dashboard.createQuarterlyGoal,
      {
        sessionId,
        title: 'Quarter 2 Goal',
        year: 2024,
        quarter: 2,
        weekNumber: 1,
      }
    );

    // Create a goal in a different year
    const nextYearGoalId = await ctx.mutation(
      api.dashboard.createQuarterlyGoal,
      {
        sessionId,
        title: 'Next Year Goal',
        year: 2025,
        quarter: 1,
        weekNumber: 1,
      }
    );

    // Delete the quarter 1 goal
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarter1GoalId,
      })
    ).resolves.toEqual(quarter1GoalId);

    // Verify that the quarter 2 goal still exists by successfully deleting it
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: quarter2GoalId,
      })
    ).resolves.toEqual(quarter2GoalId);

    // Verify that the next year goal still exists by successfully deleting it
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId: nextYearGoalId,
      })
    ).resolves.toEqual(nextYearGoalId);
  });

  test('should handle non-existent goals gracefully', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a real goal first
    const goalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);

    // Delete it
    await ctx.mutation(api.dashboard.deleteGoal, {
      sessionId,
      goalId,
    });

    // Try to delete it again (should fail with Goal not found)
    await expect(
      ctx.mutation(api.dashboard.deleteGoal, {
        sessionId,
        goalId,
      })
    ).rejects.toThrow(/Goal not found/);
  });
});
