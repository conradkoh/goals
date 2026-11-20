import { existsSync, readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';
import type { CredentialsFile } from '../credentials.js';

const WEBAPP = 'https://goals.example.com';
const CONVEX = 'https://example-123.convex.site';
const LOGIN_ARGS = ['auth', 'login', '--webapp-url', WEBAPP, '--convex-url', CONVEX];

const backendClock = { now: Date.UTC(2026, 0, 1) };
const cleanups: (() => void)[] = [];

function createWorld(options: Partial<FakeBackendOptions> = {}): {
  backend: FakeBackend;
  harness: Harness;
} {
  const backend = createFakeBackend({ pendingPolls: 0, ...options, now: () => backendClock.now });
  const harness = createHarness(backend);
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

function usage(result: { code: number; stderr: string }, contains: string): void {
  expect(result.code).toBe(2);
  expect(result.stderr.startsWith('Usage: ')).toBe(true);
  expect(result.stderr).toContain(contains);
  expect(result.stderr).toContain('goals goal list --help');
  expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals goal list validation', () => {
  it('defaults the scope to quarterly', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3']);

    expect(result.code).toBe(0);
    expect(backend.ops()).toEqual([
      { op: 'goal.list', args: { scope: 'quarterly', year: 2026, quarter: 3 } },
    ]);
  });

  it.each([
    ['--quarter is required for quarterly goals', ['--year', '2026']],
    ['--quarter is required for quarterly goals', ['--scope', 'quarterly', '--year', '2026']],
    ['--year is required for quarterly goals', ['--scope', 'quarterly', '--quarter', '3']],
    [
      '--week is not supported for quarterly goals',
      ['--year', '2026', '--quarter', '3', '--week', '31'],
    ],
    [
      '--week is required for weekly and daily goals',
      ['--scope', 'weekly', '--year', '2026', '--quarter', '3'],
    ],
    [
      '--quarter is required for weekly and daily goals',
      ['--scope', 'daily', '--year', '2026', '--week', '31'],
    ],
    ['--year is required for adhoc goals', ['--scope', 'adhoc']],
    [
      '--quarter is not supported for adhoc goals',
      ['--scope', 'adhoc', '--year', '2026', '--quarter', '3'],
    ],
  ])('rejects %s before reading credentials or sending a request', async (message, argv) => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['goal', 'list', ...argv]);

    usage(result, message);
    expect(backend.ops()).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it.each([
    ['--year must be an integer from 2000 to 2100', ['--year', '1999', '--quarter', '3']],
    ['--year must be an integer from 2000 to 2100', ['--year', 'abc', '--quarter', '3']],
    ['--quarter must be an integer from 1 to 4', ['--year', '2026', '--quarter', '5']],
    [
      '--week must be an integer from 1 to 53',
      ['--year', '2026', '--quarter', '3', '--week', '54'],
    ],
    [
      '--limit must be an integer from 1 to 500',
      ['--year', '2026', '--quarter', '3', '--limit', '0'],
    ],
    [
      '--limit must be an integer from 1 to 500',
      ['--year', '2026', '--quarter', '3', '--limit', 'abc'],
    ],
    [
      '--limit must be an integer from 1 to 500',
      ['--year', '2026', '--quarter', '3', '--limit', '501'],
    ],
  ])('rejects %s', async (message, argv) => {
    const { harness } = createWorld();

    const result = await harness.run(['goal', 'list', ...argv]);

    usage(result, message);
  });

  it('rejects --day on list as an unknown option', async () => {
    const { harness } = createWorld();

    const result = await harness.run([
      'goal',
      'list',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--day',
      'mon',
    ]);

    usage(result, '--day');
  });
});

describe('goals goal list output', () => {
  it('prints one table row per scope with its period', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedGoal({ scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3 });
    backend.seedGoal({
      scope: 'weekly',
      title: 'Draft the launch',
      year: 2026,
      quarter: 3,
      week: 31,
      isComplete: true,
    });
    backend.seedGoal({
      scope: 'daily',
      title: 'Call the printer',
      year: 2026,
      quarter: 3,
      week: 31,
      dayOfWeek: 3,
    });
    backend.seedGoal({ scope: 'adhoc', title: 'Book the venue', year: 2026, week: 31 });

    expect((await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3'])).stdout).toBe(
      ['  ID      STATUS  PERIOD   TITLE', '  goal_1  [ ]     2026 Q3  Ship the beta', ''].join(
        '\n'
      )
    );
    expect(
      (
        await harness.run([
          'goal',
          'list',
          '--scope',
          'weekly',
          '--year',
          '2026',
          '--quarter',
          '3',
          '--week',
          '31',
        ])
      ).stdout
    ).toBe(
      [
        '  ID      STATUS  PERIOD       TITLE',
        '  goal_2  [x]     2026 Q3 W31  Draft the launch',
        '',
      ].join('\n')
    );
    expect(
      (
        await harness.run([
          'goal',
          'list',
          '--scope',
          'daily',
          '--year',
          '2026',
          '--quarter',
          '3',
          '--week',
          '31',
        ])
      ).stdout
    ).toBe(
      [
        '  ID      STATUS  PERIOD           TITLE',
        '  goal_3  [ ]     2026 Q3 W31 Wed  Call the printer',
        '',
      ].join('\n')
    );
    expect((await harness.run(['goal', 'list', '--scope', 'adhoc', '--year', '2026'])).stdout).toBe(
      ['  ID      STATUS  PERIOD    TITLE', '  goal_4  [ ]     2026 W31  Book the venue', ''].join(
        '\n'
      )
    );
  });

  it('prints a bare JSON array and nothing else', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedGoal({ scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3 });

    const result = await harness.run([
      'goal',
      'list',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--json',
    ]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual([
      {
        id: 'goal_1',
        scope: 'quarterly',
        title: 'Ship the beta',
        isComplete: false,
        year: 2026,
        quarter: 3,
      },
    ]);
  });

  it('prints an empty JSON array when nothing matches', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'goal',
      'list',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--json',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('[]\n');
  });

  it('says No goals found. in text mode', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('No goals found.\n');
    expect(result.stderr).toBe('');
  });

  it('notes truncation on stderr and leaves stdout alone', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    for (const title of ['One', 'Two', 'Three']) {
      backend.seedGoal({ scope: 'quarterly', title, year: 2026, quarter: 3 });
    }

    const result = await harness.run([
      'goal',
      'list',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--limit',
      '2',
      '--json',
    ]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe(
      'Showing the first 2 goals; more exist. Use --limit to raise the cap (max 500).\n'
    );
    expect(JSON.parse(result.stdout)).toHaveLength(2);
  });

  it('sends --initiative as initiativeId', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const initiativeId = backend.seedInitiative({
      title: 'Launch',
      startDate: Date.UTC(2026, 0, 5),
    });
    backend.seedGoal({
      scope: 'quarterly',
      title: 'Ship the beta',
      year: 2026,
      quarter: 3,
      initiativeId,
    });

    const result = await harness.run([
      'goal',
      'list',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--initiative',
      initiativeId,
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Ship the beta');
    expect(backend.ops()).toEqual([
      {
        op: 'goal.list',
        args: { scope: 'quarterly', year: 2026, quarter: 3, initiativeId },
      },
    ]);
  });
});

describe('goals goal get', () => {
  it('prints the detail block, plain-text details and children', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const parentId = backend.seedGoal({
      scope: 'quarterly',
      title: 'Ship the beta',
      year: 2026,
      quarter: 3,
    });
    const weeklyId = backend.seedGoal({
      scope: 'weekly',
      title: 'Draft the launch',
      year: 2026,
      quarter: 3,
      week: 31,
      parentId,
      details: '<p>Faster <strong>launch</strong></p>',
      isComplete: true,
      completedAt: Date.UTC(2026, 2, 2),
    });
    backend.seedGoal({
      scope: 'daily',
      title: 'Call the printer',
      year: 2026,
      quarter: 3,
      week: 31,
      dayOfWeek: 3,
      parentId: weeklyId,
    });

    const result = await harness.run(['goal', 'get', weeklyId]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        'ID:      goal_2',
        'Title:   Draft the launch',
        'Scope:   weekly',
        'Status:  complete (2026-03-02)',
        'Period:  2026 Q3 W31',
        'Parent:  Ship the beta (goal_1)',
        '',
        'Details:',
        '  Faster launch',
        '',
        'Children:',
        '  [ ] goal_3  Call the printer',
        '',
      ].join('\n')
    );
    expect(result.stderr).toBe('');
  });

  it('prints the same goal as JSON', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const id = backend.seedGoal({
      scope: 'quarterly',
      title: 'Ship the beta',
      year: 2026,
      quarter: 3,
      details: '<p>Faster</p>',
      dueDate: Date.UTC(2026, 8, 30),
    });

    const result = await harness.run(['goal', 'get', id, '--json']);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      id,
      scope: 'quarterly',
      title: 'Ship the beta',
      details: '<p>Faster</p>',
      isComplete: false,
      year: 2026,
      quarter: 3,
      dueDate: Date.UTC(2026, 8, 30),
      children: [],
    });
  });

  it('reports an unknown id as one clean line', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['goal', 'get', 'goal_999']);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Not found\n');
  });

  it('maps a revoked credential to the login hint', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.invalidate(readStore(harness).accounts[0]?.token ?? '');

    const result = await harness.run(['goal', 'get', 'goal_1']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('goals auth login');
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
  });

  it('surfaces an injected server message', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.failNextCall({
      status: 400,
      code: 'invalid_argument',
      message: 'week is outside the quarter',
    });

    const result = await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('week is outside the quarter\n');
  });

  it('reports a network failure with the retry hint', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.setFailNetwork(true);

    const result = await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Unable to contact Goals; please retry.\n');
  });
});
