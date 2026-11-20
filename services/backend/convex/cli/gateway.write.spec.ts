/**
 * Gateway write-op specs: create, rename, setComplete and delete.
 *
 * Effects are asserted on the real tables through `t.run`, so the gateway is
 * proven to go through the existing public mutations and not a second write
 * path. Literal week numbers for 2026 Q3 (27–39) are used instead of calling
 * production helpers.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeGateway, NOW, type Gateway } from '../../modules/cli/gateway/testKit';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

const Q3_WEEKS = [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];

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

describe('goal.create', () => {
  test('creates a quarterly goal and seeds a state row per week', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'goal.create', {
      scope: 'quarterly',
      title: 'Grow revenue',
      details: 'Details',
      year: 2026,
      quarter: 3,
    });

    expect(result.status).toBe(200);
    const id = result.json.data.id as string;
    expect(result.json).toEqual({ ok: true, data: { id } });

    const row = await g.t.run((ctx) => ctx.db.get('goals', id as Id<'goals'>));
    expect(row).toMatchObject({
      userId: user,
      year: 2026,
      quarter: 3,
      title: 'Grow revenue',
      details: 'Details',
      depth: 0,
      isComplete: false,
    });

    const stateWeeks = await g.t.run(async (ctx) => {
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', user).eq('goalId', id as Id<'goals'>))
        .collect();
      return states.map((state) => state.weekNumber).sort((a, b) => a - b);
    });
    expect(stateWeeks).toEqual(Q3_WEEKS);
  });

  test('creates weekly and daily goals under their parents', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });

    const weeklyResult = await g.call(token, 'goal.create', {
      scope: 'weekly',
      title: 'W',
      parentId: quarterly,
      week: 30,
    });
    expect(weeklyResult.status).toBe(200);
    const weeklyId = weeklyResult.json.data.id as string;
    const weekly = await g.t.run((ctx) => ctx.db.get('goals', weeklyId as Id<'goals'>));
    expect(weekly).toMatchObject({
      userId: user,
      depth: 1,
      parentId: quarterly,
      year: 2026,
      quarter: 3,
    });

    const dailyResult = await g.call(token, 'goal.create', {
      scope: 'daily',
      title: 'D',
      parentId: weeklyId,
      week: 30,
      dayOfWeek: 4,
    });
    expect(dailyResult.status).toBe(200);
    const dailyId = dailyResult.json.data.id as string;
    const daily = await g.t.run((ctx) => ctx.db.get('goals', dailyId as Id<'goals'>));
    expect(daily).toMatchObject({ depth: 2, parentId: weeklyId, isComplete: false });

    const dailyState = await g.t.run(async (ctx) => {
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) =>
          q.eq('userId', user).eq('goalId', dailyId as Id<'goals'>)
        )
        .collect();
      return states[0];
    });
    expect(dailyState.daily?.dayOfWeek).toBe(4);
  });

  test('creates an adhoc goal that is never a weekly goal with a null parent', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'goal.create', {
      scope: 'adhoc',
      title: 'Book dentist',
      year: 2026,
      week: 30,
    });

    expect(result.status).toBe(200);
    const id = result.json.data.id as string;
    const row = await g.t.run((ctx) => ctx.db.get('goals', id as Id<'goals'>));
    expect(row?.depth).toBe(-1);
    expect(row?.adhoc?.weekNumber).toBe(30);
    expect(row?.parentId).toBeUndefined();
    expect(row?.isComplete).toBe(false);
  });

  test('rejects unsupported arguments per scope', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });

    const adhocDay = await g.call(token, 'goal.create', {
      scope: 'adhoc',
      title: 'A',
      year: 2026,
      week: 30,
      dayOfWeek: 2,
    });
    expect(adhocDay.status).toBe(400);

    const dailyUnderQuarterly = await g.call(token, 'goal.create', {
      scope: 'daily',
      title: 'D',
      parentId: quarterly,
      week: 30,
      dayOfWeek: 2,
    });
    expect(dailyUnderQuarterly.status).toBe(400);

    const weeklyUnderWeekly = await g.call(token, 'goal.create', {
      scope: 'weekly',
      title: 'W',
      parentId: await g.seedWeeklyGoal(handle, { title: 'W0', parentId: quarterly, week: 30 }),
      week: 30,
    });
    expect(weeklyUnderWeekly.status).toBe(400);

    const outsideQuarter = await g.call(token, 'goal.create', {
      scope: 'weekly',
      title: 'W',
      parentId: quarterly,
      week: 1,
    });
    expect(outsideQuarter.status).toBe(400);

    const mismatchedPeriod = await g.call(token, 'goal.create', {
      scope: 'weekly',
      title: 'W',
      parentId: quarterly,
      week: 30,
      quarter: 4,
    });
    expect(mismatchedPeriod.status).toBe(400);
  });

  test('returns 404 for a foreign initiative or domain', async () => {
    const userA = await g.seedUser('Alice', 'alice@example.com');
    const userB = await g.seedUser('Bob', 'bob@example.com');
    const sessionA = await g.login(userA);
    const sessionB = await g.login(userB);
    const foreignInitiative = await g.seedInitiative(sessionB.handle, 'Bob initiative');
    const foreignDomain = await g.seedDomain(sessionB.handle, 'Bob domain');

    const initiativeResult = await g.call(sessionA.token, 'goal.create', {
      scope: 'quarterly',
      title: 'Q',
      year: 2026,
      quarter: 3,
      initiativeId: foreignInitiative,
    });
    expect(initiativeResult.status).toBe(404);

    const domainResult = await g.call(sessionA.token, 'goal.create', {
      scope: 'adhoc',
      title: 'A',
      year: 2026,
      week: 30,
      domainId: foreignDomain,
    });
    expect(domainResult.status).toBe(404);
  });
});

describe('goal.rename', () => {
  test('preserves details and due date for quarterly, weekly and adhoc goals', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);

    const quarterly = await g.t.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: handle,
      year: 2026,
      quarter: 3,
      title: 'Quarterly old',
      details: 'Quarterly details',
      dueDate: NOW + 1_000,
      weekNumber: 30,
    });
    const weekly = await g.t.mutation(api.dashboard.createWeeklyGoal, {
      sessionId: handle,
      title: 'Weekly old',
      details: 'Weekly details',
      dueDate: NOW + 2_000,
      parentId: quarterly,
      weekNumber: 30,
    });
    const adhoc = await g.t.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId: handle,
      title: 'Adhoc old',
      details: 'Adhoc details',
      dueDate: NOW + 3_000,
      year: 2026,
      weekNumber: 30,
    });

    for (const [id, title] of [
      [quarterly, 'Quarterly new'],
      [weekly, 'Weekly new'],
      [adhoc, 'Adhoc new'],
    ] as const) {
      const result = await g.call(token, 'goal.rename', { id, title });
      expect(result.status).toBe(200);
      expect(result.json).toEqual({ ok: true, data: { id } });
    }

    const rows = await g.t.run(async (ctx) => ({
      quarterly: await ctx.db.get('goals', quarterly),
      weekly: await ctx.db.get('goals', weekly),
      adhoc: await ctx.db.get('goals', adhoc),
    }));
    expect(rows.quarterly).toMatchObject({
      title: 'Quarterly new',
      details: 'Quarterly details',
      dueDate: NOW + 1_000,
    });
    expect(rows.weekly).toMatchObject({
      title: 'Weekly new',
      details: 'Weekly details',
      dueDate: NOW + 2_000,
    });
    expect(rows.adhoc).toMatchObject({ title: 'Adhoc new', details: 'Adhoc details' });
    expect(rows.adhoc?.adhoc?.dueDate).toBe(NOW + 3_000);
  });
});

describe('goal.setComplete', () => {
  test('completes a quarterly goal in the default week and reopens it', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });

    const completed = await g.call(token, 'goal.setComplete', { id: quarterly, isComplete: true });
    expect(completed.status).toBe(200);
    expect(completed.json.data).toEqual({ id: quarterly, isComplete: true });

    const done = await g.t.run((ctx) => ctx.db.get('goals', quarterly));
    expect(done?.isComplete).toBe(true);
    expect(done?.completedAt).toBe(NOW);

    const stateWeeks = await g.t.run(async (ctx) => {
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', user).eq('goalId', quarterly))
        .collect();
      return states.map((state) => state.weekNumber).sort((a, b) => a - b);
    });
    expect(stateWeeks).toEqual(Q3_WEEKS);

    const reopened = await g.call(token, 'goal.setComplete', { id: quarterly, isComplete: false });
    expect(reopened.status).toBe(200);
    const open = await g.t.run((ctx) => ctx.db.get('goals', quarterly));
    expect(open?.isComplete).toBe(false);
    expect(open?.completedAt).toBeUndefined();
  });

  test('leaves the week state snapshot untouched', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    const weekly = await g.seedWeeklyGoal(handle, { title: 'W', parentId: quarterly, week: 30 });
    const readState = () =>
      g.t.run((ctx) =>
        ctx.db
          .query('goalStateByWeek')
          .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
            q
              .eq('userId', user)
              .eq('goalId', weekly)
              .eq('year', 2026)
              .eq('quarter', 3)
              .eq('weekNumber', 30)
          )
          .first()
      );

    const before = await readState();
    const result = await g.call(token, 'goal.setComplete', {
      id: weekly,
      week: 30,
      isComplete: true,
    });
    expect(result.status).toBe(200);
    expect(result.json.data).toEqual({ id: weekly, isComplete: true });

    const row = await g.t.run((ctx) => ctx.db.get('goals', weekly));
    expect(row?.isComplete).toBe(true);
    expect(row?.completedAt).toBe(NOW);
    expect(await readState()).toEqual(before);
  });

  test('completes children only when includeChildren is true', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });

    const withChildren = await g.seedWeeklyGoal(handle, {
      title: 'WC',
      parentId: quarterly,
      week: 30,
    });
    const childA = await g.seedDailyGoal(handle, {
      title: 'D1',
      parentId: withChildren,
      week: 30,
      dayOfWeek: 1,
    });
    const childB = await g.seedDailyGoal(handle, {
      title: 'D2',
      parentId: withChildren,
      week: 30,
      dayOfWeek: 2,
    });

    const withoutChildren = await g.seedWeeklyGoal(handle, {
      title: 'WO',
      parentId: quarterly,
      week: 30,
    });
    const childC = await g.seedDailyGoal(handle, {
      title: 'D3',
      parentId: withoutChildren,
      week: 30,
      dayOfWeek: 3,
    });

    expect(
      (
        await g.call(token, 'goal.setComplete', {
          id: withChildren,
          week: 30,
          isComplete: true,
          includeChildren: true,
        })
      ).status
    ).toBe(200);
    expect(
      (
        await g.call(token, 'goal.setComplete', {
          id: withoutChildren,
          week: 30,
          isComplete: true,
        })
      ).status
    ).toBe(200);

    const rows = await g.t.run(async (ctx) => ({
      a: await ctx.db.get('goals', childA),
      b: await ctx.db.get('goals', childB),
      c: await ctx.db.get('goals', childC),
    }));
    expect(rows.a?.isComplete).toBe(true);
    expect(rows.b?.isComplete).toBe(true);
    expect(rows.c?.isComplete).toBe(false);
  });

  test('rejects a week outside the quarter and leaves the row unchanged', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    const weekly = await g.seedWeeklyGoal(handle, { title: 'W', parentId: quarterly, week: 30 });

    const result = await g.call(token, 'goal.setComplete', {
      id: weekly,
      week: 1,
      isComplete: true,
    });
    expect(result.status).toBe(400);
    const row = await g.t.run((ctx) => ctx.db.get('goals', weekly));
    expect(row?.isComplete).toBe(false);
  });

  test('requires an explicit week for a weekly goal', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    const weekly = await g.seedWeeklyGoal(handle, { title: 'W', parentId: quarterly, week: 30 });

    const result = await g.call(token, 'goal.setComplete', { id: weekly, isComplete: true });
    expect(result.status).toBe(400);
  });

  test('maps a missing week state to 404 through the existing NOT_FOUND', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    // The weekly goal only has a state row for week 30.
    const weekly = await g.seedWeeklyGoal(handle, { title: 'W', parentId: quarterly, week: 30 });

    const result = await g.call(token, 'goal.setComplete', {
      id: weekly,
      week: 31,
      isComplete: true,
    });

    expect(result.status).toBe(404);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'Not found' },
    });
  });

  test('completes and reopens an adhoc goal through adhocGoalStates', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const adhoc = await g.seedAdhocGoal(handle, { title: 'A', year: 2026, week: 30 });

    expect((await g.call(token, 'goal.setComplete', { id: adhoc, isComplete: true })).status).toBe(
      200
    );
    const completed = await g.t.run(async (ctx) => ({
      goal: await ctx.db.get('goals', adhoc),
      state: await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', user).eq('goalId', adhoc))
        .first(),
    }));
    expect(completed.goal?.isComplete).toBe(true);
    expect(completed.goal?.completedAt).toBe(NOW);
    expect(completed.state?.isComplete).toBe(true);

    expect((await g.call(token, 'goal.setComplete', { id: adhoc, isComplete: false })).status).toBe(
      200
    );
    const reopened = await g.t.run(async (ctx) => ({
      goal: await ctx.db.get('goals', adhoc),
      state: await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', user).eq('goalId', adhoc))
        .first(),
    }));
    expect(reopened.goal?.isComplete).toBe(false);
    expect(reopened.goal?.completedAt).toBeUndefined();
    expect(reopened.state?.isComplete).toBe(false);
  });
});

describe('goal.delete', () => {
  test('cascades a quarterly goal to weekly and daily goals and their states', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    const weekly = await g.seedWeeklyGoal(handle, { title: 'W', parentId: quarterly, week: 30 });
    const daily = await g.seedDailyGoal(handle, {
      title: 'D',
      parentId: weekly,
      week: 30,
      dayOfWeek: 2,
    });

    const result = await g.call(token, 'goal.delete', { id: quarterly });

    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, data: { id: quarterly } });

    const remaining = await g.t.run(async (ctx) => ({
      goals: await ctx.db.query('goals').collect(),
      states: await ctx.db.query('goalStateByWeek').collect(),
    }));
    expect(remaining.goals).toEqual([]);
    expect(remaining.states).toEqual([]);
    expect([quarterly, weekly, daily]).toHaveLength(3);
  });

  test('deletes an adhoc goal and its state', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const adhoc = await g.seedAdhocGoal(handle, { title: 'A', year: 2026, week: 30 });

    const result = await g.call(token, 'goal.delete', { id: adhoc });
    expect(result.status).toBe(200);

    const remaining = await g.t.run(async (ctx) => ({
      goal: await ctx.db.get('goals', adhoc),
      states: await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', user).eq('goalId', adhoc))
        .collect(),
    }));
    expect(remaining.goal).toBeNull();
    expect(remaining.states).toEqual([]);
  });

  test('the second delete of the same id is 404', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const adhoc = await g.seedAdhocGoal(handle, { title: 'A', year: 2026, week: 30 });

    expect((await g.call(token, 'goal.delete', { id: adhoc })).status).toBe(200);
    const second = await g.call(token, 'goal.delete', { id: adhoc });
    expect(second.status).toBe(404);
    expect(second.json).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'Not found' },
    });
  });
});
