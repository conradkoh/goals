/**
 * The single scripted end-to-end gateway journey.
 *
 * Real device-code login over `t.fetch`, then a full write/read round trip with
 * the issued bearer token, then logout and a rejected call.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeGateway, NOW, type Gateway } from '../../modules/cli/gateway/testKit';
import type { Id } from '../_generated/dataModel';

let g: Gateway;

beforeEach(() => {
  g = makeGateway();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('scripted gateway end-to-end', () => {
  test('logs in, creates, completes, lists, logs out and rejects', async () => {
    const user = await g.seedUser('Alice', 'alice@example.com');
    const { token } = await g.login(user);

    // 1. Create a quarterly goal.
    const quarterly = await g.call(token, 'goal.create', {
      scope: 'quarterly',
      title: 'Grow revenue',
      year: 2026,
      quarter: 3,
    });
    expect(quarterly.status).toBe(200);
    expect(quarterly.json.ok).toBe(true);
    const quarterlyId = quarterly.json.data.id as string;
    const quarterlyRow = await g.t.run((ctx) => ctx.db.get('goals', quarterlyId as Id<'goals'>));
    expect(quarterlyRow).toMatchObject({ userId: user, title: 'Grow revenue', depth: 0 });

    // 2. Create a weekly goal under it.
    const weekly = await g.call(token, 'goal.create', {
      scope: 'weekly',
      title: 'Close ten deals',
      parentId: quarterlyId,
      week: 30,
    });
    expect(weekly.status).toBe(200);
    const weeklyId = weekly.json.data.id as string;
    const weeklyRow = await g.t.run((ctx) => ctx.db.get('goals', weeklyId as Id<'goals'>));
    expect(weeklyRow).toMatchObject({ userId: user, parentId: quarterlyId, depth: 1 });

    // 3. Complete the weekly goal.
    const completed = await g.call(token, 'goal.setComplete', {
      id: weeklyId,
      week: 30,
      isComplete: true,
    });
    expect(completed.status).toBe(200);
    expect(completed.json.data).toEqual({ id: weeklyId, isComplete: true });
    const doneRow = await g.t.run((ctx) => ctx.db.get('goals', weeklyId as Id<'goals'>));
    expect(doneRow?.isComplete).toBe(true);

    // 4. Read it back through a list.
    const listed = await g.call(token, 'goal.list', {
      scope: 'weekly',
      year: 2026,
      quarter: 3,
      week: 30,
    });
    expect(listed.status).toBe(200);
    expect(listed.json.data.items).toEqual([
      {
        id: weeklyId,
        scope: 'weekly',
        title: 'Close ten deals',
        isComplete: true,
        completedAt: NOW,
        year: 2026,
        quarter: 3,
        week: 30,
        parentId: quarterlyId,
      },
    ]);

    // 5. Log out; the next call is rejected.
    const revoked = await g.post('/cli/auth/revoke', undefined, {
      authorization: `Bearer ${token}`,
    });
    expect(revoked.status).toBe(200);

    const rejected = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
    });
    expect(rejected.status).toBe(401);
    expect(rejected.json).toEqual({
      ok: false,
      error: { code: 'unauthorized', message: 'Invalid or revoked credential' },
    });
  });
});
