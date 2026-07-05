import { ConvexError } from 'convex/values';
import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { DayOfWeek } from '../src/constants';
import { api } from './_generated/api';
import schema from './schema';
import { convexTest } from '../src/util/test';

const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

describe('initiative', () => {
  test('createInitiative rejects empty title', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    await expect(
      ctx.mutation(api.initiative.createInitiative, {
        sessionId,
        title: '   ',
        startDate: 1_700_000_000_000,
        endDate: 1_700_086_400_000,
      })
    ).rejects.toThrow(ConvexError);
  });

  test('createInitiative rejects start date after end date', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    await expect(
      ctx.mutation(api.initiative.createInitiative, {
        sessionId,
        title: 'Q1 Launch',
        startDate: 1_700_100_000_000,
        endDate: 1_700_000_000_000,
      })
    ).rejects.toThrow(ConvexError);
  });

  test('createInitiative without endDate succeeds', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Ongoing Initiative',
      startDate: 1_700_000_000_000,
    });

    const initiative = await ctx.run(async (dbCtx) => dbCtx.db.get('initiatives', initiativeId));
    expect(initiative?.endDate).toBeUndefined();
  });

  test('updateInitiative with endDate null clears end date', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Bounded Initiative',
      startDate: 1_700_000_000_000,
      endDate: 1_700_086_400_000,
    });

    await ctx.mutation(api.initiative.updateInitiative, {
      sessionId,
      initiativeId,
      endDate: null,
    });

    const initiative = await ctx.run(async (dbCtx) => dbCtx.db.get('initiatives', initiativeId));
    expect(initiative?.endDate).toBeUndefined();
  });

  test('updateInitiative rejects empty title', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Valid Title',
      startDate: 1_700_000_000_000,
      endDate: 1_700_086_400_000,
    });

    await expect(
      ctx.mutation(api.initiative.updateInitiative, {
        sessionId,
        initiativeId,
        title: '  ',
      })
    ).rejects.toThrow(ConvexError);
  });

  test('deleteInitiative blocked when goals are tagged', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Tagged Initiative',
      startDate: 1_700_000_000_000,
      endDate: 1_700_086_400_000,
    });

    const quarterlyGoalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarterly Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    await ctx.mutation(api.dashboard.updateQuarterlyGoalTitle, {
      sessionId,
      goalId: quarterlyGoalId,
      title: 'Quarterly Goal',
      initiativeId,
    });

    await expect(
      ctx.mutation(api.initiative.deleteInitiative, {
        sessionId,
        initiativeId,
      })
    ).rejects.toThrow(ConvexError);
  });

  test('getInitiatives returns initiatives sorted by start date then title', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Beta',
      startDate: 1_700_100_000_000,
      endDate: 1_700_200_000_000,
    });
    await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Alpha',
      startDate: 1_700_000_000_000,
      endDate: 1_700_086_400_000,
    });
    await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Zeta',
      startDate: 1_700_100_000_000,
      endDate: 1_700_300_000_000,
    });

    const initiatives = await ctx.query(api.initiative.getInitiatives, { sessionId });
    expect(initiatives.map((i: { title: string }) => i.title)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  test('tagging quarterly goal propagates initiativeId to weekly and daily descendants', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Cascade Test',
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

    await ctx.mutation(api.dashboard.updateQuarterlyGoalTitle, {
      sessionId,
      goalId: quarterlyGoalId,
      title: 'Quarterly',
      initiativeId,
    });

    const quarterly = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', quarterlyGoalId));
    const weekly = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', weeklyGoalId));
    const daily = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', dailyGoalId));

    expect(quarterly?.initiativeId).toBe(initiativeId);
    expect(weekly?.initiativeId).toBe(initiativeId);
    expect(daily?.initiativeId).toBe(initiativeId);
  });

  test('untagging with null clears initiativeId on descendants', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Untag Test',
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

    await ctx.mutation(api.dashboard.updateQuarterlyGoalTitle, {
      sessionId,
      goalId: quarterlyGoalId,
      title: 'Quarterly',
      initiativeId,
    });

    await ctx.mutation(api.dashboard.updateQuarterlyGoalTitle, {
      sessionId,
      goalId: quarterlyGoalId,
      title: 'Quarterly',
      initiativeId: null,
    });

    const quarterly = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', quarterlyGoalId));
    const weekly = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', weeklyGoalId));

    expect(quarterly?.initiativeId).toBeUndefined();
    expect(weekly?.initiativeId).toBeUndefined();
  });

  test('tagging adhoc goal propagates to nested adhoc children', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const initiativeId = await ctx.mutation(api.initiative.createInitiative, {
      sessionId,
      title: 'Adhoc Cascade',
      startDate: 1_700_000_000_000,
      endDate: 1_700_500_000_000,
    });

    const parentAdhocId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Parent Adhoc',
      year: 2024,
      weekNumber: 10,
    });
    const childAdhocId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Child Adhoc',
      year: 2024,
      weekNumber: 10,
      parentId: parentAdhocId,
    });

    await ctx.mutation(api.adhocGoal.updateAdhocGoal, {
      sessionId,
      goalId: parentAdhocId,
      initiativeId,
    });

    const parent = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', parentAdhocId));
    const child = await ctx.run(async (dbCtx) => dbCtx.db.get('goals', childAdhocId));

    expect(parent?.initiativeId).toBe(initiativeId);
    expect(child?.initiativeId).toBe(initiativeId);
  });
});
