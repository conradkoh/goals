import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { DayOfWeek } from '../constants';
import { propagateInitiativeToDescendants } from './propagateInitiativeToDescendants';
import { convexTest } from './test';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

describe('propagateInitiativeToDescendants', () => {
  test('leaf daily goal has no descendants — only root is patched', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Leaf Test',
      startDate: 1_700_000_000_000,
      endDate: 1_700_500_000_000,
    });

    const quarterlyGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarterly',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
    const weeklyGoalId = await ctx.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: 'Weekly',
      parentId: quarterlyGoalId,
      weekNumber: 1,
    });
    const dailyGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Daily',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.MONDAY,
    });

    const patchedCount = await ctx.run(async (dbCtx) => {
      const dailyGoal = await dbCtx.db.get('goals', dailyGoalId);
      if (!dailyGoal) throw new Error('Daily goal not found');
      return propagateInitiativeToDescendants(
        dbCtx,
        dailyGoal,
        dailyGoal.userId,
        initiativeId as Id<'initiatives'>
      );
    });

    expect(patchedCount).toBe(1);

    const daily = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', dailyGoalId));
    expect(daily?.initiativeId).toBe(initiativeId);
  });

  test('adhoc parent propagates to single child without duplicate patches', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Adhoc Dedupe',
      startDate: 1_700_000_000_000,
      endDate: 1_700_500_000_000,
    });

    const parentAdhocId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Parent',
      year: 2024,
      weekNumber: 5,
    });
    const childAdhocId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Child',
      year: 2024,
      weekNumber: 5,
      parentId: parentAdhocId,
    });

    const patchedCount = await ctx.run(async (dbCtx) => {
      const parentGoal = await dbCtx.db.get('goals', parentAdhocId);
      if (!parentGoal) throw new Error('Parent goal not found');
      return propagateInitiativeToDescendants(
        dbCtx,
        parentGoal,
        parentGoal.userId,
        initiativeId as Id<'initiatives'>
      );
    });

    expect(patchedCount).toBe(2);

    const goals = await ctx.run(async (dbCtx) => {
      const parent = await dbCtx.db.get('goals', parentAdhocId);
      const child = await dbCtx.db.get('goals', childAdhocId);
      return { parent, child };
    });

    expect(goals.parent?.initiativeId).toBe(initiativeId);
    expect(goals.child?.initiativeId).toBe(initiativeId);
  });

  test('propagateInitiativeToDescendants patches root and all structured descendants', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Propagation Test',
      startDate: 1_700_000_000_000,
      endDate: 1_700_500_000_000,
    });

    const quarterlyGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarterly',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
    const weeklyGoalId = await ctx.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: 'Weekly',
      parentId: quarterlyGoalId,
      weekNumber: 1,
    });
    const dailyGoalId = await ctx.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: 'Daily',
      parentId: weeklyGoalId,
      weekNumber: 1,
      dayOfWeek: DayOfWeek.TUESDAY,
    });

    const patchedCount = await ctx.run(async (dbCtx) => {
      const quarterlyGoal = await dbCtx.db.get('goals', quarterlyGoalId);
      if (!quarterlyGoal) throw new Error('Quarterly goal not found');
      return propagateInitiativeToDescendants(
        dbCtx,
        quarterlyGoal,
        quarterlyGoal.userId,
        initiativeId as Id<'initiatives'>
      );
    });

    expect(patchedCount).toBe(3);

    const goals = await ctx.run(async (dbCtx) => {
      const quarterly = await dbCtx.db.get('goals', quarterlyGoalId);
      const weekly = await dbCtx.db.get('goals', weeklyGoalId);
      const daily = await dbCtx.db.get('goals', dailyGoalId);
      return { quarterly, weekly, daily };
    });

    expect(goals.quarterly?.initiativeId).toBe(initiativeId);
    expect(goals.weekly?.initiativeId).toBe(initiativeId);
    expect(goals.daily?.initiativeId).toBe(initiativeId);
  });
});
