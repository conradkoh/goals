/**
 * Gateway isolation spec: the cross-user matrix.
 *
 * Every op that accepts an id must answer 404 with a byte-identical body for a
 * foreign id, a deleted id, a malformed id and a wrong-table id, and no
 * attempted write may change either user's goals table.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeGateway, NOW, type Gateway, type HttpResult } from '../../modules/cli/gateway/testKit';
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

/** Inserts a goal and deletes it, leaving a well-formed id with no row. */
async function deletedGoal(userId: Id<'users'>): Promise<string> {
  return g.t.run(async (ctx) => {
    const id = await ctx.db.insert('goals', {
      userId,
      year: 2026,
      quarter: 3,
      title: 'Deleted goal',
      inPath: '/',
      depth: 0,
      isComplete: false,
    });
    await ctx.db.delete('goals', id);
    return id as string;
  });
}

/** Inserts an initiative and deletes it, leaving a well-formed id with no row. */
async function deletedInitiative(userId: Id<'users'>): Promise<string> {
  return g.t.run(async (ctx) => {
    const id = await ctx.db.insert('initiatives', { userId, title: 'Deleted', startDate: NOW });
    await ctx.db.delete('initiatives', id);
    return id as string;
  });
}

/** Inserts a domain and deletes it, leaving a well-formed id with no row. */
async function deletedDomain(userId: Id<'users'>): Promise<string> {
  return g.t.run(async (ctx) => {
    const id = await ctx.db.insert('domains', { userId, name: 'Deleted' });
    await ctx.db.delete('domains', id);
    return id as string;
  });
}

/** Asserts all four probing ids produce the identical fixed 404 body. */
async function expectIndistinguishable(
  run: (id: string) => Promise<HttpResult>,
  ids: string[]
): Promise<void> {
  const results: HttpResult[] = [];
  for (const id of ids) results.push(await run(id));
  for (const result of results) expect(result.status).toBe(404);
  expect(new Set(results.map((result) => result.text)).size).toBe(1);
  expect(results[0].text).toBe('{"ok":false,"error":{"code":"not_found","message":"Not found"}}');
}

/** Stable snapshot of the whole goals table. */
async function goalsSnapshot(): Promise<string> {
  const rows = await g.t.run((ctx) => ctx.db.query('goals').collect());
  return JSON.stringify([...rows].sort((a, b) => a._id.localeCompare(b._id)));
}

describe('cross-user id matrix', () => {
  test('every id-taking op is indistinguishable for foreign, deleted, malformed and wrong-table ids', async () => {
    const userA = await g.seedUser('Alice', 'alice@example.com');
    const userB = await g.seedUser('Bob', 'bob@example.com');
    const sessionA = await g.login(userA);
    const sessionB = await g.login(userB);

    await g.seedQuarterlyGoal(sessionA.handle, {
      title: 'A quarterly',
      year: 2026,
      quarter: 3,
    });
    await g.seedAdhocGoal(sessionA.handle, { title: 'A adhoc', year: 2026, week: 30 });

    const quarterlyB = await g.seedQuarterlyGoal(sessionB.handle, {
      title: 'B quarterly',
      year: 2026,
      quarter: 3,
    });
    const initiativeB = await g.seedInitiative(sessionB.handle, 'B initiative');
    const domainB = await g.seedDomain(sessionB.handle, 'B domain');

    const deletedGoalId = await deletedGoal(userA);
    const deletedInitiativeId = await deletedInitiative(userA);
    const deletedDomainId = await deletedDomain(userA);
    const wrongTableId = userB as string;
    const malformed = 'not-an-id';

    // Read ops and goal writes.
    const goalIds = [quarterlyB, deletedGoalId, malformed, wrongTableId];
    await expectIndistinguishable((id) => g.call(sessionA.token, 'goal.get', { id }), goalIds);
    await expectIndistinguishable(
      (id) => g.call(sessionA.token, 'goal.rename', { id, title: 'Hijacked' }),
      goalIds
    );
    await expectIndistinguishable(
      (id) => g.call(sessionA.token, 'goal.setComplete', { id, isComplete: true }),
      goalIds
    );
    await expectIndistinguishable((id) => g.call(sessionA.token, 'goal.delete', { id }), goalIds);
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'goal.create', {
          scope: 'weekly',
          title: 'Hijacked child',
          parentId: id,
          week: 30,
        }),
      goalIds
    );

    // Initiative-bearing ops.
    const initiativeIds = [initiativeB, deletedInitiativeId, malformed, wrongTableId];
    await expectIndistinguishable(
      (id) => g.call(sessionA.token, 'initiative.get', { id }),
      initiativeIds
    );
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'goal.list', {
          scope: 'quarterly',
          year: 2026,
          quarter: 3,
          initiativeId: id,
        }),
      initiativeIds
    );
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'goal.create', {
          scope: 'quarterly',
          title: 'Hijacked',
          year: 2026,
          quarter: 3,
          initiativeId: id,
        }),
      initiativeIds
    );

    // Domain-bearing ops.
    const domainIds = [domainB, deletedDomainId, malformed, wrongTableId];
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'goal.create', {
          scope: 'adhoc',
          title: 'Hijacked',
          year: 2026,
          week: 30,
          domainId: id,
        }),
      domainIds
    );
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'export.quarterSummary', {
          year: 2026,
          quarter: 3,
          adhocDomainIds: [id],
        }),
      domainIds
    );

    // Export by goal id.
    await expectIndistinguishable(
      (id) =>
        g.call(sessionA.token, 'export.quarterSummary', {
          year: 2026,
          quarter: 3,
          goalIds: [id],
        }),
      goalIds
    );

    // No attempted write touched either user's goals.
    const goals = await goalsSnapshot();
    expect(goals).toContain('A quarterly');
    expect(goals).toContain('B quarterly');
    expect(goals).not.toContain('Hijacked');
    expect(goals).not.toContain('Hijacked child');

    // The credential only sees its own goals.
    const listed = await g.call(sessionA.token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
    });
    expect(listed.json.data.items.map((row: { title: string }) => row.title)).toEqual([
      'A quarterly',
    ]);
    expect(listed.json.data.items.map((row: { id: string }) => row.id)).not.toContain(quarterlyB);
  });

  test('a failed foreign write leaves both goal tables unchanged', async () => {
    const userA = await g.seedUser('Alice', 'alice@example.com');
    const userB = await g.seedUser('Bob', 'bob@example.com');
    const sessionA = await g.login(userA);
    const sessionB = await g.login(userB);
    const quarterlyB = await g.seedQuarterlyGoal(sessionB.handle, {
      title: 'B quarterly',
      year: 2026,
      quarter: 3,
    });
    await g.seedQuarterlyGoal(sessionA.handle, { title: 'A quarterly', year: 2026, quarter: 3 });

    const before = await goalsSnapshot();
    for (const op of ['goal.rename', 'goal.setComplete', 'goal.delete'] as const) {
      const args =
        op === 'goal.rename'
          ? { id: quarterlyB, title: 'Hijacked' }
          : op === 'goal.setComplete'
            ? { id: quarterlyB, isComplete: true }
            : { id: quarterlyB };
      const result = await g.call(sessionA.token, op, args);
      expect(result.status).toBe(404);
      expect(await goalsSnapshot()).toBe(before);
    }
  });
});
