import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import schema from '../../../convex/schema';
import { DayOfWeek } from '../../constants';
import { convexTest } from '../../util/test';

const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

enum GoalDepth {
  Quarterly = 'quarterly',
  Weekly = 'weekly',
  Daily = 'daily',
}

const createMockGoal = async (
  ctx: ReturnType<typeof convexTest>,
  sessionId: SessionId,
  depth: GoalDepth,
  parentId?: Id<'goals'>
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
    if (!parentId) throw new Error('Weekly goal requires parent');
    return await ctx.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: `Goal ${depth}`,
      parentId,
      weekNumber: 1,
    });
  }
  if (!parentId) throw new Error('Daily goal requires parent');
  return await ctx.mutation(api.dashboard.createDailyGoal, {
    sessionId,
    title: `Goal ${depth}`,
    parentId,
    weekNumber: 1,
    dayOfWeek: DayOfWeek.MONDAY,
  });
};

describe('moveHierarchicalGoalsFromWeek (via moveGoalsFromWeek)', () => {
  test('pulls quarterly/weekly/daily hierarchy with empty adhoc fields', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const quarterlyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Quarterly);
    const weeklyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Weekly, quarterlyGoalId);
    const dailyGoalId = await createMockGoal(ctx, sessionId, GoalDepth.Daily, weeklyGoalId);

    const preview = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: true,
    })) as unknown as {
      canPull: boolean;
      weekStatesToCopy: unknown[];
      dailyGoalsToMove: { id: Id<'goals'> }[];
      adhocGoalsToMove: unknown[];
    };

    expect(preview.canPull).toBe(true);
    expect(preview.weekStatesToCopy.length).toBeGreaterThan(0);
    expect(preview.dailyGoalsToMove.map((g) => g.id)).toContain(dailyGoalId);
    expect(preview.adhocGoalsToMove).toEqual([]);

    const moveResult = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: false,
    })) as unknown as { weekStatesCopied: number; adhocGoalsMoved: number };

    expect(moveResult.weekStatesCopied).toBeGreaterThan(0);
    expect(moveResult.adhocGoalsMoved).toBe(0);
  });

  test('normalizes quarter metadata from ISO week number', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2026;

    const quarterlyGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Q1 quarterly goal',
      year,
      quarter: 1,
      weekNumber: 13,
    });
    const weeklyGoalId = await ctx.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: 'Week 13 weekly goal',
      parentId: quarterlyGoalId,
      weekNumber: 13,
    });
    await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Week 13 daily goal',
      parentId: weeklyGoalId,
      weekNumber: 13,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    const preview = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year, quarter: 2, weekNumber: 13 },
      to: { year, quarter: 2, weekNumber: 14, dayOfWeek: DayOfWeek.MONDAY },
      dryRun: true,
    })) as unknown as { canPull: boolean; dailyGoalsToMove: unknown[] };

    expect(preview.canPull).toBe(true);
    expect(preview.dailyGoalsToMove.length).toBeGreaterThan(0);
  });
});
