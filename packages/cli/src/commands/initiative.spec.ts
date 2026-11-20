import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';

const LOGIN_ARGS = [
  'auth',
  'login',
  '--webapp-url',
  'https://goals.example.com',
  '--convex-url',
  'https://example-123.convex.site',
];

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

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals initiative list', () => {
  it('prints one row per initiative', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedInitiative({
      title: 'Launch',
      startDate: Date.UTC(2026, 0, 5),
      endDate: Date.UTC(2026, 2, 31),
    });
    backend.seedInitiative({ title: 'Refresh', startDate: Date.UTC(2026, 1, 1) });

    const result = await harness.run(['initiative', 'list']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        '  ID      START       END         TITLE',
        '  init_1  2026-01-05  2026-03-31  Launch',
        '  init_2  2026-02-01  -           Refresh',
        '',
      ].join('\n')
    );
    expect(result.stderr).toBe('');
  });

  it('prints a bare JSON array', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedInitiative({ title: 'Launch', startDate: Date.UTC(2026, 0, 5) });

    const result = await harness.run(['initiative', 'list', '--json']);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      { id: 'init_1', title: 'Launch', startDate: Date.UTC(2026, 0, 5) },
    ]);
  });

  it('prints an empty JSON array', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['initiative', 'list', '--json']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('[]\n');
  });

  it('says No initiatives found. in text mode', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['initiative', 'list']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('No initiatives found.\n');
  });

  it('notes truncation on stderr', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    for (const title of ['One', 'Two']) {
      backend.seedInitiative({ title, startDate: Date.UTC(2026, 0, 5) });
    }

    const result = await harness.run(['initiative', 'list', '--limit', '1', '--json']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe(
      'Showing the first 1 initiatives; more exist. Use --limit to raise the cap (max 500).\n'
    );
    expect(JSON.parse(result.stdout)).toHaveLength(1);
  });
});

describe('goals initiative get', () => {
  it('prints the initiative block, description and goals table', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const initiativeId = backend.seedInitiative({
      title: 'Launch',
      description: '<p>Faster <em>launch</em></p>',
      startDate: Date.UTC(2026, 0, 5),
      endDate: Date.UTC(2026, 2, 31),
    });
    backend.seedGoal({
      scope: 'quarterly',
      title: 'Ship the beta',
      year: 2026,
      quarter: 3,
      initiativeId,
    });

    const result = await harness.run(['initiative', 'get', initiativeId]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        'ID:     init_1',
        'Title:  Launch',
        'Start:  2026-01-05',
        'End:    2026-03-31',
        '',
        'Description:',
        '  Faster launch',
        '',
        'Goals:',
        '  ID      STATUS  PERIOD   TITLE',
        '  goal_1  [ ]     2026 Q3  Ship the beta',
        '',
      ].join('\n')
    );
  });

  it('prints the initiative and goals as JSON', async () => {
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

    const result = await harness.run(['initiative', 'get', initiativeId, '--json']);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      initiative: { id: initiativeId, title: 'Launch', startDate: Date.UTC(2026, 0, 5) },
      goals: [
        {
          id: 'goal_1',
          scope: 'quarterly',
          title: 'Ship the beta',
          isComplete: false,
          year: 2026,
          quarter: 3,
          initiativeId,
        },
      ],
    });
  });

  it('says No goals found. when the initiative has none', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const initiativeId = backend.seedInitiative({
      title: 'Launch',
      startDate: Date.UTC(2026, 0, 5),
    });

    const result = await harness.run(['initiative', 'get', initiativeId]);

    expect(result.code).toBe(0);
    expect(result.stdout.endsWith('Goals:\nNo goals found.\n')).toBe(true);
  });

  it('reports an unknown id', async () => {
    const { harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['initiative', 'get', 'init_999']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Not found\n');
  });

  it('requires an id before reading credentials', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['initiative', 'get']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      'Usage: missing required argument <id>. Run `goals initiative get --help` for usage.\n'
    );
    expect(backend.ops()).toEqual([]);
  });
});
