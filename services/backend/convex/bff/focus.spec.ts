import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { convexTest } from '../../src/util/test';
import { api } from '../_generated/api';
import schema from '../schema';

const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

describe('bff.focus.getFocusedViewData', () => {
  test('shows incomplete adhoc fire goals from other weeks in urgent section', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2024;

    const pastWeekGoalId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Urgent from week 10',
      year,
      weekNumber: 10,
    });

    await ctx.mutation(api.fireGoal.toggleFireStatus, {
      sessionId,
      goalId: pastWeekGoalId,
    });

    const data = await ctx.query(api.bff.focus.getFocusedViewData, {
      sessionId,
      year,
      quarter: 1,
      weekNumber: 20,
      dayOfWeek: 1,
    });

    expect(data.urgent.map((g) => g._id)).toContain(pastWeekGoalId);
    expect(data.urgent.find((g) => g._id === pastWeekGoalId)?.weekNumber).toBe(10);
    expect(data.adhocTasks.map((g) => g._id)).not.toContain(pastWeekGoalId);
  });

  test('excludes completed fire goals from urgent section', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2024;

    const goalId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Completed urgent task',
      year,
      weekNumber: 10,
    });

    await ctx.mutation(api.fireGoal.toggleFireStatus, {
      sessionId,
      goalId,
    });

    await ctx.mutation(api.adhocGoal.updateAdhocGoal, {
      sessionId,
      goalId,
      isComplete: true,
    });

    const data = await ctx.query(api.bff.focus.getFocusedViewData, {
      sessionId,
      year,
      quarter: 1,
      weekNumber: 20,
      dayOfWeek: 1,
    });

    expect(data.urgent.map((g) => g._id)).not.toContain(goalId);
  });

  test('shows incomplete adhoc goals from other weeks in tasks section', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2024;

    const pastWeekGoalId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Open task from week 5',
      year,
      weekNumber: 5,
    });

    const data = await ctx.query(api.bff.focus.getFocusedViewData, {
      sessionId,
      year,
      quarter: 1,
      weekNumber: 20,
      dayOfWeek: 1,
    });

    expect(data.adhocTasks.map((g) => g._id)).toContain(pastWeekGoalId);
  });
});
