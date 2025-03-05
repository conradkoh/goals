import { convexTest } from '../src/util/test';
import { test, expect, describe } from 'vitest';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';
import { DayOfWeek } from '../src/constants';
import schema from './schema';
import { GoalWithDetailsAndChildren } from '../src/usecase/getWeekDetails';

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

describe('dashboard', () => {
  test('createQuarterlyGoal should create a goal', async () => {
    const ctx = convexTest(schema);
    const sessionId = await ctx.mutation(api.auth.useAnonymousSession, {});

    const quarterlyGoalId = await ctx.mutation(
      api.dashboard.createQuarterlyGoal,
      {
        sessionId,
        title: 'Test Quarterly Goal',
        year: 2024,
        quarter: 1,
        weekNumber: 1,
      }
    );

    expect(quarterlyGoalId).toBeDefined();
  });
});
