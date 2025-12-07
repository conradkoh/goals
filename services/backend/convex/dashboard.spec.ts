import { describe, expect, test } from 'vitest';
import { convexTest } from '../src/util/test';
import { api } from './_generated/api';
import schema from './schema';

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
