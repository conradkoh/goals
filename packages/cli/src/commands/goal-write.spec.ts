import { existsSync, readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';
import type { CredentialsFile } from '../credentials.js';

const LOGIN_ARGS = [
  'auth',
  'login',
  '--webapp-url',
  'https://goals.example.com',
  '--convex-url',
  'https://example-123.convex.site',
];

/** Local Monday noon, 3 August 2026: ISO week 2026 W32 in every zone. */
const WEEK_32 = new Date(2026, 7, 3, 12).getTime();
const cleanups: (() => void)[] = [];

function createWorld(options: Partial<FakeBackendOptions> = {}): {
  backend: FakeBackend;
  harness: Harness;
} {
  const clock = { now: WEEK_32 };
  const backend = createFakeBackend({ pendingPolls: 0, ...options, now: () => clock.now });
  const harness = createHarness(backend);
  harness.clock.now = clock.now;
  cleanups.push(() => {
    harness.cleanup();
  });
  return { backend, harness };
}

async function signIn(harness: Harness): Promise<void> {
  const result = await harness.run(LOGIN_ARGS);
  expect(result.code).toBe(0);
}

function readStore(harness: Harness): CredentialsFile {
  return JSON.parse(readFileSync(harness.credentialsPath, 'utf8')) as CredentialsFile;
}

function usage(result: { code: number; stderr: string }, message: string, hint: string): void {
  expect(result.code).toBe(2);
  expect(result.stderr).toBe(`Usage: ${message}. Run \`${hint}\` for usage.\n`);
}

/** A seeded quarterly goal, so weekly/daily creates have a real parent. */
function seedQuarterly(backend: FakeBackend): string {
  return backend.seedGoal({ scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3 });
}

function seedWeekly(backend: FakeBackend, parentId: string): string {
  return backend.seedGoal({
    scope: 'weekly',
    title: 'Draft the launch',
    year: 2026,
    quarter: 3,
    week: 32,
    parentId,
  });
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals goal create validation', () => {
  it.each([
    ['--scope is required', ['--title', 'Ship the beta']],
    [
      '--scope must be one of quarterly, weekly, daily, adhoc',
      ['--scope', 'monthly', '--title', 'x'],
    ],
    ['--title is required', ['--scope', 'quarterly', '--year', '2026', '--quarter', '3']],
    [
      '--title must not be empty',
      ['--scope', 'quarterly', '--year', '2026', '--quarter', '3', '--title', '  '],
    ],
    [
      '--year is required for quarterly goals',
      ['--scope', 'quarterly', '--quarter', '3', '--title', 'x'],
    ],
    [
      '--quarter is required for quarterly goals',
      ['--scope', 'quarterly', '--year', '2026', '--title', 'x'],
    ],
    [
      '--parent is not supported for quarterly goals',
      [
        '--scope',
        'quarterly',
        '--year',
        '2026',
        '--quarter',
        '3',
        '--title',
        'x',
        '--parent',
        'goal_1',
      ],
    ],
    [
      '--day is not supported for quarterly goals',
      ['--scope', 'quarterly', '--year', '2026', '--quarter', '3', '--title', 'x', '--day', 'mon'],
    ],
    [
      '--domain is not supported for quarterly goals',
      [
        '--scope',
        'quarterly',
        '--year',
        '2026',
        '--quarter',
        '3',
        '--title',
        'x',
        '--domain',
        'domain_1',
      ],
    ],
    ['--parent is required for weekly goals', ['--scope', 'weekly', '--title', 'x']],
    [
      '--day is not supported for weekly goals',
      ['--scope', 'weekly', '--parent', 'goal_1', '--title', 'x', '--day', 'mon'],
    ],
    [
      '--domain is not supported for weekly goals',
      ['--scope', 'weekly', '--parent', 'goal_1', '--title', 'x', '--domain', 'domain_1'],
    ],
    ['--parent is required for daily goals', ['--scope', 'daily', '--day', 'mon', '--title', 'x']],
    [
      '--day is required for daily goals',
      ['--scope', 'daily', '--parent', 'goal_2', '--title', 'x'],
    ],
    [
      '--domain is not supported for daily goals',
      [
        '--scope',
        'daily',
        '--parent',
        'goal_2',
        '--day',
        'mon',
        '--title',
        'x',
        '--domain',
        'domain_1',
      ],
    ],
    [
      '--quarter is not supported for adhoc goals',
      ['--scope', 'adhoc', '--title', 'x', '--quarter', '3'],
    ],
    [
      '--day is not supported for adhoc goals',
      ['--scope', 'adhoc', '--title', 'x', '--day', 'mon'],
    ],
    [
      '--week is required for adhoc goals when --year is not the current ISO year',
      ['--scope', 'adhoc', '--title', 'x', '--year', '2025'],
    ],
  ])('rejects %s before reading credentials', async (message, argv) => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['goal', 'create', ...argv]);

    usage(result, message, 'goals goal create --help');
    expect(backend.ops()).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('rejects a bad --day value', async () => {
    const { harness } = createWorld();

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'daily',
      '--parent',
      'goal_2',
      '--day',
      'funday',
      '--title',
      'x',
    ]);

    usage(result, '--day must be 1-7 or mon..sun', 'goals goal create --help');
  });
});

describe('goals goal create requests', () => {
  it('creates a quarterly goal without a client-side week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'quarterly',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--title',
      '  Ship the beta  ',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('Created quarterly goal goal_1.\n');
    expect(backend.ops()).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3 },
      },
    ]);
  });

  it('creates a weekly goal with the current ISO week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedQuarterly(backend);

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'weekly',
      '--parent',
      parentId,
      '--title',
      'Draft the launch',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('Created weekly goal goal_2.\n');
    expect(backend.ops()).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'weekly', title: 'Draft the launch', week: 32, parentId },
      },
    ]);
  });

  it('creates a daily goal with --day as a number from 1 to 7', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedWeekly(backend, seedQuarterly(backend));

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'daily',
      '--parent',
      parentId,
      '--day',
      '7',
      '--title',
      'Call the printer',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops()).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'daily', title: 'Call the printer', week: 32, parentId, dayOfWeek: 7 },
      },
    ]);
  });

  it.each([
    ['mon', 1],
    ['wed', 3],
    ['SUNDAY', 7],
  ])('maps --day %s to dayOfWeek %i', async (day, expected) => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedWeekly(backend, seedQuarterly(backend));

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'daily',
      '--parent',
      parentId,
      '--day',
      day,
      '--title',
      'Call the printer',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops()[0]).toEqual({
      op: 'goal.create',
      args: {
        scope: 'daily',
        title: 'Call the printer',
        week: 32,
        parentId,
        dayOfWeek: expected,
      },
    });
  });

  it('defaults adhoc year and week to the current ISO week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'adhoc',
      '--title',
      'Book the venue',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops()).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'adhoc', title: 'Book the venue', year: 2026, week: 32 },
      },
    ]);
  });

  it('honours an explicit adhoc year and week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'adhoc',
      '--year',
      '2025',
      '--week',
      '5',
      '--title',
      'Book the venue',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops()[0]).toEqual({
      op: 'goal.create',
      args: { scope: 'adhoc', title: 'Book the venue', year: 2025, week: 5 },
    });
  });

  it('honours an explicit week for weekly and quarterly goals', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedQuarterly(backend);

    await harness.run([
      'goal',
      'create',
      '--scope',
      'weekly',
      '--parent',
      parentId,
      '--week',
      '30',
      '--title',
      'Draft the launch',
    ]);
    await harness.run([
      'goal',
      'create',
      '--scope',
      'quarterly',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--week',
      '30',
      '--title',
      'Ship the beta',
    ]);

    expect(backend.ops()).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'weekly', title: 'Draft the launch', week: 30, parentId },
      },
      {
        op: 'goal.create',
        args: { scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3, week: 30 },
      },
    ]);
  });
});

describe('goals goal rename', () => {
  it('sends the trimmed title', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedQuarterly(backend);

    const result = await harness.run(['goal', 'rename', id, '--title', '  Renamed  ']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Renamed goal ${id}.\n`);
    expect(backend.ops()).toEqual([{ op: 'goal.rename', args: { id, title: 'Renamed' } }]);
  });

  it('requires a non-empty title', async () => {
    const { backend, harness } = createWorld();
    const id = seedQuarterly(backend);

    usage(
      await harness.run(['goal', 'rename', id, '--title', '']),
      '--title must not be empty',
      'goals goal rename --help'
    );
    usage(
      await harness.run(['goal', 'rename', id]),
      '--title is required',
      'goals goal rename --help'
    );
    expect(backend.ops()).toEqual([]);
  });
});

describe('goals goal complete and reopen', () => {
  it('sends one setComplete when --week is given', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedQuarterly(backend);

    const result = await harness.run(['goal', 'complete', id, '--week', '32']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Goal ${id} is now complete.\n`);
    expect(backend.ops()).toEqual([
      { op: 'goal.setComplete', args: { id, isComplete: true, week: 32 } },
    ]);
  });

  it('requires --week for a weekly goal and names the current ISO week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedWeekly(backend, seedQuarterly(backend));

    const result = await harness.run(['goal', 'complete', id]);

    usage(
      result,
      '--week is required to complete a weekly goal (the current ISO week is 32)',
      'goals goal complete --help'
    );
    expect(backend.ops()).toEqual([{ op: 'goal.get', args: { id } }]);
  });

  it('reopens a daily goal without --week as a usage error', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedWeekly(backend, seedQuarterly(backend));
    const id = backend.seedGoal({
      scope: 'daily',
      title: 'Call the printer',
      year: 2026,
      quarter: 3,
      week: 32,
      dayOfWeek: 2,
      parentId,
    });

    const result = await harness.run(['goal', 'reopen', id]);

    usage(
      result,
      '--week is required to reopen a daily goal (the current ISO week is 32)',
      'goals goal reopen --help'
    );
    expect(backend.ops()).toEqual([{ op: 'goal.get', args: { id } }]);
  });

  it('completes a quarterly goal after one get and without a week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedQuarterly(backend);

    const result = await harness.run(['goal', 'complete', id]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Goal ${id} is now complete.\n`);
    expect(backend.ops()).toEqual([
      { op: 'goal.get', args: { id } },
      { op: 'goal.setComplete', args: { id, isComplete: true } },
    ]);
  });

  it('completes an adhoc goal without a week', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = backend.seedGoal({ scope: 'adhoc', title: 'Book the venue', year: 2026, week: 32 });

    const result = await harness.run(['goal', 'complete', id]);

    expect(result.code).toBe(0);
    expect(backend.ops()).toEqual([
      { op: 'goal.get', args: { id } },
      { op: 'goal.setComplete', args: { id, isComplete: true } },
    ]);
  });

  it('sends includeChildren only when the flag is present', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedQuarterly(backend);

    await harness.run(['goal', 'complete', id, '--week', '32', '--include-children']);
    await harness.run(['goal', 'complete', id, '--week', '32']);

    expect(backend.ops()).toEqual([
      { op: 'goal.setComplete', args: { id, isComplete: true, week: 32, includeChildren: true } },
      { op: 'goal.setComplete', args: { id, isComplete: true, week: 32 } },
    ]);
  });

  it('reports the returned incomplete state', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = seedQuarterly(backend);

    const result = await harness.run(['goal', 'reopen', id, '--week', '32']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Goal ${id} is now incomplete.\n`);
  });
});

describe('goals goal delete', () => {
  it('refuses without --yes, before any read or request', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['goal', 'delete', 'goal_1']);

    usage(
      result,
      'refusing to delete goal goal_1 without --yes: this deletes the goal and all of its child goals',
      'goals goal delete --help'
    );
    expect(backend.requests).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('deletes the goal and its descendants', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = seedQuarterly(backend);
    const weeklyId = seedWeekly(backend, parentId);
    backend.seedGoal({
      scope: 'daily',
      title: 'Call the printer',
      year: 2026,
      quarter: 3,
      week: 32,
      dayOfWeek: 2,
      parentId: weeklyId,
    });

    const result = await harness.run(['goal', 'delete', parentId, '--yes']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Deleted goal ${parentId} and all of its child goals.\n`);
    expect(backend.goals()).toEqual([]);
    expect(backend.ops()).toEqual([{ op: 'goal.delete', args: { id: parentId } }]);
  });

  it('reports a foreign goal id as not found', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const foreignId = backend.seedGoal({
      ownerUserId: 'user_2',
      scope: 'quarterly',
      title: 'Not mine',
      year: 2026,
      quarter: 3,
    });

    const result = await harness.run(['goal', 'delete', foreignId, '--yes']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Not found\n');
    expect(backend.goals()).toHaveLength(0);
  });

  it('rejects --json on a write command', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['goal', 'delete', 'goal_1', '--yes', '--json']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--json');
  });
});

describe('goals goal write identity', () => {
  it('uses the credential named by --as', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'goal',
      'create',
      '--scope',
      'adhoc',
      '--title',
      'Book the venue',
      '--as',
      'missing',
    ]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("no identity labelled 'missing'");
    expect(readStore(harness).accounts).toHaveLength(1);
    expect(backend.ops()).toEqual([]);
  });
});
