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

describe('moveAdhocGoalsFromWeek (via moveGoalsFromWeek)', () => {
  test('pulls only adhoc goals with empty hierarchical fields', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2026;

    const adhocGoalId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Week-level adhoc task',
      year,
      weekNumber: 10,
    });

    const preview = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year, quarter: 1, weekNumber: 10 },
      to: { year, quarter: 1, weekNumber: 11, dayOfWeek: DayOfWeek.MONDAY },
      dryRun: true,
    })) as unknown as {
      canPull: boolean;
      weekStatesToCopy: unknown[];
      dailyGoalsToMove: unknown[];
      quarterlyGoalsToUpdate: unknown[];
      adhocGoalsToMove: { id: Id<'goals'> }[];
    };

    expect(preview.canPull).toBe(true);
    expect(preview.adhocGoalsToMove.map((g) => g.id)).toContain(adhocGoalId);
    expect(preview.weekStatesToCopy).toEqual([]);
    expect(preview.dailyGoalsToMove).toEqual([]);
    expect(preview.quarterlyGoalsToUpdate).toEqual([]);

    const moveResult = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year, quarter: 1, weekNumber: 10 },
      to: { year, quarter: 1, weekNumber: 11, dayOfWeek: DayOfWeek.MONDAY },
      dryRun: false,
    })) as { adhocGoalsMoved: number; weekStatesCopied: number };

    expect(moveResult.adhocGoalsMoved).toBe(1);
    expect(moveResult.weekStatesCopied).toBe(0);
  });

  test('does not pull completed adhoc goals', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const year = 2026;

    const adhocGoalId = await ctx.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: 'Completed adhoc',
      year,
      weekNumber: 12,
    });

    await ctx.mutation(api.adhocGoal.updateAdhocGoal, {
      sessionId,
      goalId: adhocGoalId,
      isComplete: true,
    });

    const preview = (await ctx.mutation(api.goal.moveGoalsFromWeek, {
      sessionId,
      from: { year, quarter: 1, weekNumber: 12 },
      to: { year, quarter: 1, weekNumber: 13, dayOfWeek: DayOfWeek.MONDAY },
      dryRun: true,
    })) as unknown as { canPull: boolean; adhocGoalsToMove: unknown[] };

    expect(preview.canPull).toBe(false);
    expect(preview.adhocGoalsToMove).toEqual([]);
  });
});
