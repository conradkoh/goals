import { convexTest } from '../src/util/test';
import { test, expect, describe } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

describe('fireGoal', () => {
  test('should toggle fire status correctly', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a test goal
    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Test Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Initially, there should be no fire goals
    const initialFireGoals = await ctx.query(api.fireGoal.getFireGoals, {
      sessionId,
    });
    expect(initialFireGoals).toHaveLength(0);

    // Toggle fire status on (should return true)
    const isOnFire = await ctx.mutation(api.fireGoal.toggleFireStatus, {
      sessionId,
      goalId,
    });
    expect(isOnFire).toBe(true);

    // Check that the goal is now on fire
    const fireGoals = await ctx.query(api.fireGoal.getFireGoals, {
      sessionId,
    });
    expect(fireGoals).toHaveLength(1);
    expect(fireGoals).toContain(goalId);

    // Toggle fire status off (should return false)
    const isNotOnFire = await ctx.mutation(api.fireGoal.toggleFireStatus, {
      sessionId,
      goalId,
    });
    expect(isNotOnFire).toBe(false);

    // Check that the goal is no longer on fire
    const finalFireGoals = await ctx.query(api.fireGoal.getFireGoals, {
      sessionId,
    });
    expect(finalFireGoals).toHaveLength(0);
  });

  test('should not allow toggling fire status of non-existent goals', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a goal and then delete it
    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Test Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
    await ctx.mutation(api.goal.deleteGoal, { sessionId, goalId });

    // Try to toggle fire status of deleted goal
    await expect(
      ctx.mutation(api.fireGoal.toggleFireStatus, {
        sessionId,
        goalId,
      })
    ).rejects.toThrow(/Goal not found/);
  });

  test('should not allow toggling fire status of other users goals', async () => {
    const ctx = convexTest(schema);
    const sessionId1 = await ctx.mutation(api.auth.useAnonymousSession, {});
    const sessionId2 = await ctx.mutation(api.auth.useAnonymousSession, {});

    // Create a goal for user 1
    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: sessionId1,
      title: 'Test Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    // Try to toggle fire status with user 2's session
    await expect(
      ctx.mutation(api.fireGoal.toggleFireStatus, {
        sessionId: sessionId2,
        goalId,
      })
    ).rejects.toThrow(/You do not have permission to update this goal/);
  });
});
