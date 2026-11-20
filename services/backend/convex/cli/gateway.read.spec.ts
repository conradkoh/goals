/**
 * Gateway read-op specs: whoami, goal.list, goal.get and the initiative ops.
 *
 * Fixtures are created through the existing public mutations wherever the
 * behaviour under test is the gateway's projection, so the handle is proven to
 * work on real functions rather than on stubbed data.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeGateway, NOW, type Gateway } from '../../modules/cli/gateway/testKit';
import { api } from '../_generated/api';

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

describe('auth.whoami', () => {
  test('returns identity metadata without any secret field', async () => {
    const user = await g.seedUser('Alice', 'alice@example.com');
    const session = await g.login(user);

    const result = await g.call(session.token, 'auth.whoami');

    expect(result.status).toBe(200);
    expect(result.json).toEqual({
      ok: true,
      data: {
        userId: user,
        name: 'Alice',
        email: 'alice@example.com',
        credentialId: session.credentialId,
        machineName: 'macbook-pro',
        createdAt: NOW,
        expiresAt: NOW + 15_552_000_000,
      },
    });
    expect(result.text).not.toContain('handle');
    expect(result.text).not.toContain('token');
  });

  test('omits email for an anonymous user', async () => {
    const user = await g.t.run((ctx) =>
      ctx.db.insert('users', { type: 'anonymous', name: 'Anon' })
    );
    const session = await g.login(user);

    const result = await g.call(session.token, 'auth.whoami');

    expect(result.status).toBe(200);
    expect(result.json.data).not.toHaveProperty('email');
  });
});

describe('goal.list', () => {
  test('lists quarterly goals of one quarter with literal rows', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const first = await g.seedQuarterlyGoal(handle, {
      title: 'Grow revenue',
      year: 2026,
      quarter: 3,
    });
    const second = await g.seedQuarterlyGoal(handle, { title: 'Ship v1', year: 2026, quarter: 3 });
    await g.seedQuarterlyGoal(handle, { title: 'Next quarter', year: 2026, quarter: 4 });

    const result = await g.call(token, 'goal.list', { scope: 'quarterly', year: 2026, quarter: 3 });

    expect(result.status).toBe(200);
    expect(result.json.data.truncated).toBe(false);
    expect(result.json.data.items).toEqual([
      {
        id: first,
        scope: 'quarterly',
        title: 'Grow revenue',
        isComplete: false,
        year: 2026,
        quarter: 3,
      },
      {
        id: second,
        scope: 'quarterly',
        title: 'Ship v1',
        isComplete: false,
        year: 2026,
        quarter: 3,
      },
    ]);
  });

  test('flattens the week tree and separates weekly from daily', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, {
      title: 'Quarterly',
      year: 2026,
      quarter: 3,
    });
    const weekly = await g.seedWeeklyGoal(handle, {
      title: 'Weekly',
      parentId: quarterly,
      week: 30,
    });
    const daily = await g.seedDailyGoal(handle, {
      title: 'Daily',
      parentId: weekly,
      week: 30,
      dayOfWeek: 3,
    });

    const weeklies = await g.call(token, 'goal.list', {
      scope: 'weekly',
      year: 2026,
      quarter: 3,
      week: 30,
    });
    expect(weeklies.status).toBe(200);
    expect(weeklies.json.data.items).toEqual([
      {
        id: weekly,
        scope: 'weekly',
        title: 'Weekly',
        isComplete: false,
        year: 2026,
        quarter: 3,
        week: 30,
        parentId: quarterly,
      },
    ]);

    const dailies = await g.call(token, 'goal.list', {
      scope: 'daily',
      year: 2026,
      quarter: 3,
      week: 30,
    });
    expect(dailies.json.data.items).toEqual([
      {
        id: daily,
        scope: 'daily',
        title: 'Daily',
        isComplete: false,
        year: 2026,
        quarter: 3,
        week: 30,
        dayOfWeek: 3,
        parentId: weekly,
      },
    ]);
  });

  test('lists adhoc rows without a quarter, filtered by year and week', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const domain = await g.seedDomain(handle, 'Health');
    const thisWeek = await g.seedAdhocGoal(handle, {
      title: 'Book dentist',
      year: 2026,
      week: 30,
      domainId: domain,
    });
    const nextWeek = await g.seedAdhocGoal(handle, { title: 'Buy paint', year: 2026, week: 31 });
    await g.seedAdhocGoal(handle, { title: 'Last year', year: 2025, week: 30 });

    const all = await g.call(token, 'goal.list', { scope: 'adhoc', year: 2026 });
    expect(all.status).toBe(200);
    expect(all.json.data.items.map((row: { title: string }) => row.title)).toEqual([
      'Book dentist',
      'Buy paint',
    ]);
    expect(all.json.data.items[0]).toEqual({
      id: thisWeek,
      scope: 'adhoc',
      title: 'Book dentist',
      isComplete: false,
      year: 2026,
      week: 30,
      domainId: domain,
      domainName: 'Health',
    });
    expect(all.json.data.items[1].id).toBe(nextWeek);

    const filtered = await g.call(token, 'goal.list', { scope: 'adhoc', year: 2026, week: 30 });
    expect(filtered.json.data.items).toHaveLength(1);
    expect(filtered.json.data.items[0].id).toBe(thisWeek);
  });

  test('narrows by initiative', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const initiative = await g.seedInitiative(handle, 'Launch');
    const tagged = await g.t.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: handle,
      year: 2026,
      quarter: 3,
      title: 'Tagged',
      weekNumber: 30,
      initiativeId: initiative,
    });
    const untagged = await g.seedQuarterlyGoal(handle, {
      title: 'Untagged',
      year: 2026,
      quarter: 3,
    });

    const result = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
      initiativeId: initiative,
    });

    expect(result.status).toBe(200);
    expect(result.json.data.items.map((row: { id: string }) => row.id)).toEqual([tagged]);
    expect(result.json.data.items[0].initiativeId).toBe(initiative);
    expect(result.json.data.items.map((row: { id: string }) => row.id)).not.toContain(untagged);
  });

  test('bounds with limit and reports truncation', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    for (const title of ['One', 'Two', 'Three']) {
      await g.seedQuarterlyGoal(handle, { title, year: 2026, quarter: 3 });
    }

    const bounded = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
      limit: 2,
    });
    expect(bounded.json.data.items).toHaveLength(2);
    expect(bounded.json.data.truncated).toBe(true);

    const unbounded = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
    });
    expect(unbounded.json.data.items).toHaveLength(3);
    expect(unbounded.json.data.truncated).toBe(false);
  });

  test('requires quarter for quarterly and week for weekly', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const noQuarter = await g.call(token, 'goal.list', { scope: 'quarterly', year: 2026 });
    expect(noQuarter.status).toBe(400);

    const weeklyNoWeek = await g.call(token, 'goal.list', {
      scope: 'weekly',
      year: 2026,
      quarter: 3,
    });
    expect(weeklyNoWeek.status).toBe(400);

    const adhocQuarter = await g.call(token, 'goal.list', {
      scope: 'adhoc',
      year: 2026,
      quarter: 3,
    });
    expect(adhocQuarter.status).toBe(400);
  });
});

describe('goal.get', () => {
  test('returns detail, parent title, due date and children', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, {
      title: 'Quarterly parent',
      year: 2026,
      quarter: 3,
    });
    const weekly = await g.t.mutation(api.dashboard.createWeeklyGoal, {
      sessionId: handle,
      title: 'Weekly child',
      details: 'Some details',
      dueDate: NOW + 86_400_000,
      parentId: quarterly,
      weekNumber: 30,
    });
    const daily = await g.seedDailyGoal(handle, {
      title: 'Daily child',
      parentId: weekly,
      week: 30,
      dayOfWeek: 2,
    });

    const result = await g.call(token, 'goal.get', { id: weekly });

    expect(result.status).toBe(200);
    expect(result.json.data).toEqual({
      id: weekly,
      scope: 'weekly',
      title: 'Weekly child',
      details: 'Some details',
      isComplete: false,
      year: 2026,
      quarter: 3,
      parentId: quarterly,
      parentTitle: 'Quarterly parent',
      dueDate: NOW + 86_400_000,
      children: [{ id: daily, title: 'Daily child', isComplete: false }],
    });
  });
});

describe('initiative ops', () => {
  test('list returns the initiative shape and truncates', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const first = await g.seedInitiative(handle, 'Alpha');

    const all = await g.call(token, 'initiative.list', {});
    expect(all.status).toBe(200);
    expect(all.json.data).toEqual({
      items: [{ id: first, title: 'Alpha', startDate: NOW }],
      truncated: false,
    });

    await g.seedInitiative(handle, 'Beta');
    const both = await g.call(token, 'initiative.list', {});
    expect(both.json.data.items.map((item: { title: string }) => item.title)).toEqual([
      'Alpha',
      'Beta',
    ]);

    const bounded = await g.call(token, 'initiative.list', { limit: 1 });
    expect(bounded.json.data.items).toHaveLength(1);
    expect(bounded.json.data.truncated).toBe(true);
  });

  test('get flattens goals in contract order', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const initiative = await g.seedInitiative(handle, 'Launch');
    const quarterly = await g.t.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: handle,
      year: 2026,
      quarter: 3,
      title: 'Q',
      weekNumber: 30,
      initiativeId: initiative,
    });
    const weekly = await g.seedWeeklyGoal(handle, {
      title: 'W',
      parentId: quarterly,
      week: 30,
    });
    await g.seedDailyGoal(handle, { title: 'D', parentId: weekly, week: 30, dayOfWeek: 1 });
    await g.t.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId: handle,
      title: 'A',
      year: 2026,
      weekNumber: 30,
      initiativeId: initiative,
    });

    const result = await g.call(token, 'initiative.get', { id: initiative });

    expect(result.status).toBe(200);
    expect(result.json.data.initiative).toEqual({
      id: initiative,
      title: 'Launch',
      startDate: NOW,
    });
    expect(
      result.json.data.goals.items.map((row: { scope: string; title: string }) => [
        row.scope,
        row.title,
      ])
    ).toEqual([
      ['quarterly', 'Q'],
      ['weekly', 'W'],
      ['daily', 'D'],
      ['adhoc', 'A'],
    ]);
    expect(result.json.data.goals.truncated).toBe(false);
  });

  test('get truncates at 200 goals', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const initiative = await g.seedInitiative(handle, 'Big');
    await g.t.run(async (ctx) => {
      for (let index = 0; index < 201; index += 1) {
        await ctx.db.insert('goals', {
          userId: user,
          year: 2026,
          quarter: 3,
          title: `Goal ${index}`,
          inPath: '/',
          depth: 0,
          isComplete: false,
          initiativeId: initiative,
        });
      }
    });

    const result = await g.call(token, 'initiative.get', { id: initiative });
    expect(result.json.data.goals.items).toHaveLength(200);
    expect(result.json.data.goals.truncated).toBe(true);
  });
});
