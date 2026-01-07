import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';
import { convexTest } from '../src/util/test';

/**
 * Helper to create a test session using the template's loginAnon pattern.
 */
const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

describe('dashboard', () => {
  test('createQuarterlyGoal should create a goal', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

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
