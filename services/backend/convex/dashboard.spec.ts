import { describe, expect, test } from 'vitest';
import { DayOfWeek } from '../src/constants';
import { convexTest } from '../src/util/test';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
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
const _createMockGoal = async (
  ctx: TestCtx,
  sessionId: Id<'sessions'>,
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

describe('dashboard', () => {
  test('createQuarterlyGoal should create a goal', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    const quarterlyGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Test Quarterly Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    expect(quarterlyGoalId).toBeDefined();
  });
});
