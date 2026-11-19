/**
 * Gateway export spec: the quarter summary must satisfy the shared markdown
 * contract and must never leak a raw Convex document.
 *
 * The runtime seam feeds the projected summary to the real shared generator, so
 * the compile-time return type and the runtime wire shape are both exercised.
 */

import { generateMultipleQuarterlyGoalsMarkdown } from '@workspace/shared/utilities/quarterly-markdown';
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

describe('export.quarterSummary', () => {
  test('projects only contract keys and feeds the shared generator', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const quarterly = await g.t.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: handle,
      year: 2026,
      quarter: 3,
      title: 'Quarterly Alpha',
      details: 'Quarterly details',
      weekNumber: 30,
    });
    const weekly = await g.seedWeeklyGoal(handle, {
      title: 'Weekly Alpha',
      parentId: quarterly,
      week: 30,
    });
    await g.seedDailyGoal(handle, {
      title: 'Daily Alpha',
      parentId: weekly,
      week: 30,
      dayOfWeek: 1,
    });
    await g.seedAdhocGoal(handle, {
      title: 'Adhoc Alpha',
      year: 2026,
      week: 30,
      details: 'Adhoc details',
    });

    // Complete the quarterly goal so the markdown carries a completed marker.
    await g.call(token, 'goal.setComplete', { id: quarterly, isComplete: true });

    const result = await g.call(token, 'export.quarterSummary', { year: 2026, quarter: 3 });

    expect(result.status).toBe(200);
    const summary = result.json.data.summary;
    expect(Object.keys(summary).sort()).toEqual([
      'adhocGoals',
      'quarter',
      'quarterlyGoals',
      'weekRange',
      'year',
    ]);
    expect(summary.year).toBe(2026);
    expect(summary.quarter).toBe(3);
    expect(summary.weekRange).toEqual({ startWeek: 27, endWeek: 39 });
    expect(summary.quarterlyGoals).toHaveLength(1);
    expect(summary.quarterlyGoals[0].quarterlyGoal).toEqual({
      title: 'Quarterly Alpha',
      details: 'Quarterly details',
      isComplete: true,
      completedAt: NOW,
    });
    expect(summary.quarterlyGoals[0].weeklyGoalsByWeek['30']).toEqual([
      {
        title: 'Weekly Alpha',
        isComplete: false,
        children: [{ title: 'Daily Alpha', isComplete: false }],
      },
    ]);
    expect(summary.adhocGoals).toEqual([
      {
        title: 'Adhoc Alpha',
        isComplete: false,
        details: 'Adhoc details',
        adhoc: { weekNumber: 30 },
      },
    ]);

    for (const leaked of ['_id', 'userId', 'inPath', '_creationTime', '"state"', 'path']) {
      expect(result.text).not.toContain(leaked);
    }

    const markdown = generateMultipleQuarterlyGoalsMarkdown(summary, {
      now: NOW,
      timeZone: 'UTC',
    });
    for (const title of ['Quarterly Alpha', 'Weekly Alpha', 'Daily Alpha', 'Adhoc Alpha']) {
      expect(markdown).toContain(title);
    }
    expect(markdown).toContain('**Completed:**');
    expect(markdown).toContain('[x] Quarterly Alpha');
  });

  test('honours an explicit goalIds subset', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    const first = await g.seedQuarterlyGoal(handle, { title: 'First', year: 2026, quarter: 3 });
    await g.seedQuarterlyGoal(handle, { title: 'Second', year: 2026, quarter: 3 });

    const result = await g.call(token, 'export.quarterSummary', {
      year: 2026,
      quarter: 3,
      goalIds: [first],
      includeAdhoc: false,
    });

    expect(result.status).toBe(200);
    expect(
      result.json.data.summary.quarterlyGoals.map(
        (item: { quarterlyGoal: { title: string } }) => item.quarterlyGoal.title
      )
    ).toEqual(['First']);
  });

  test('returns the same 404 for every unusable goal id', async () => {
    const userA = await g.seedUser('Alice', 'alice@example.com');
    const userB = await g.seedUser('Bob', 'bob@example.com');
    const sessionA = await g.login(userA);
    const sessionB = await g.login(userB);
    const quarterly = await g.seedQuarterlyGoal(sessionA.handle, {
      title: 'Q',
      year: 2026,
      quarter: 3,
    });
    const weekly = await g.seedWeeklyGoal(sessionA.handle, {
      title: 'W',
      parentId: quarterly,
      week: 30,
    });
    const otherQuarter = await g.seedQuarterlyGoal(sessionA.handle, {
      title: 'Q4',
      year: 2026,
      quarter: 4,
    });
    const foreign = await g.seedQuarterlyGoal(sessionB.handle, {
      title: 'Bob Q',
      year: 2026,
      quarter: 3,
    });

    const bodies: string[] = [];
    for (const goalId of [foreign, weekly, otherQuarter, 'not-an-id']) {
      const result = await g.call(sessionA.token, 'export.quarterSummary', {
        year: 2026,
        quarter: 3,
        goalIds: [goalId],
      });
      expect(result.status).toBe(404);
      bodies.push(result.text);
    }
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).toBe('{"ok":false,"error":{"code":"not_found","message":"Not found"}}');
  });

  test('filters adhoc goals by UNCATEGORIZED and rejects a foreign domain', async () => {
    const userA = await g.seedUser('Alice', 'alice@example.com');
    const userB = await g.seedUser('Bob', 'bob@example.com');
    const sessionA = await g.login(userA);
    const sessionB = await g.login(userB);
    const domain = await g.seedDomain(sessionA.handle, 'Health');
    await g.seedAdhocGoal(sessionA.handle, {
      title: 'Domain adhoc',
      year: 2026,
      week: 30,
      domainId: domain,
    });
    await g.seedAdhocGoal(sessionA.handle, { title: 'Uncategorized adhoc', year: 2026, week: 30 });
    const foreignDomain = await g.seedDomain(sessionB.handle, 'Bob domain');

    const uncategorized = await g.call(sessionA.token, 'export.quarterSummary', {
      year: 2026,
      quarter: 3,
      adhocDomainIds: ['UNCATEGORIZED'],
    });
    expect(uncategorized.status).toBe(200);
    expect(
      uncategorized.json.data.summary.adhocGoals.map((goal: { title: string }) => goal.title)
    ).toEqual(['Uncategorized adhoc']);

    const foreign = await g.call(sessionA.token, 'export.quarterSummary', {
      year: 2026,
      quarter: 3,
      adhocDomainIds: [foreignDomain],
    });
    expect(foreign.status).toBe(404);
  });

  test('omits adhoc goals when includeAdhoc is false', async () => {
    const user = await g.seedUser();
    const { token, handle } = await g.login(user);
    await g.seedQuarterlyGoal(handle, { title: 'Q', year: 2026, quarter: 3 });
    await g.seedAdhocGoal(handle, { title: 'A', year: 2026, week: 30 });

    const result = await g.call(token, 'export.quarterSummary', {
      year: 2026,
      quarter: 3,
      includeAdhoc: false,
    });

    expect(result.status).toBe(200);
    expect(result.json.data.summary).not.toHaveProperty('adhocGoals');
    expect(result.text).not.toContain('"adhocGoals"');
  });

  test('returns an empty summary for an empty quarter', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'export.quarterSummary', { year: 2027, quarter: 2 });

    expect(result.status).toBe(200);
    expect(result.json.data.summary).toEqual({
      quarterlyGoals: [],
      year: 2027,
      quarter: 2,
      weekRange: { startWeek: 13, endWeek: 25 },
    });
  });
});
