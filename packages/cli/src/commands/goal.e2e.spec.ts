import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend } from '../__testing__/fakeBackend.js';
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

/** Local Monday noon, 3 August 2026: ISO week 2026 W32 in every zone. */
const WEEK_32 = new Date(2026, 7, 3, 12).getTime();
const cleanups: (() => void)[] = [];

function createWorld(): { backend: FakeBackend; harness: Harness } {
  const clock = { now: WEEK_32 };
  const backend = createFakeBackend({ pendingPolls: 0, now: () => clock.now });
  const harness = createHarness(backend);
  harness.clock.now = clock.now;
  cleanups.push(() => {
    harness.cleanup();
  });
  return { backend, harness };
}

/** "Created weekly goal goal_2." → "goal_2"; proves the printed id is the write target. */
function createdId(stdout: string): string {
  const match = /^Created [a-z]+ goal (goal_\d+)\.\n$/.exec(stdout);
  if (match === null || match[1] === undefined) throw new Error(`unexpected output: ${stdout}`);
  return match[1];
}

function expectCode(result: { code: number; stderr: string }, code = 0): void {
  expect(result.stderr).toBe('');
  expect(result.code).toBe(code);
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goal lifecycle end to end', () => {
  it('runs create, read, complete and delete against one backend', async () => {
    const { backend, harness } = createWorld();

    // Login, then seed one initiative the adhoc goal can join.
    expect((await harness.run(LOGIN_ARGS)).code).toBe(0);
    const initiativeId = backend.seedInitiative({
      title: 'Launch',
      description: '<p>Faster launch</p>',
      startDate: Date.UTC(2026, 0, 5),
    });

    // Create one goal per scope, each id taken from the success line.
    const quarterly = await harness.run([
      'goal',
      'create',
      '--scope',
      'quarterly',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--title',
      'Ship the beta',
    ]);
    expectCode(quarterly);
    expect(quarterly.stdout).toBe('Created quarterly goal goal_1.\n');
    const quarterlyId = createdId(quarterly.stdout);

    const weekly = await harness.run([
      'goal',
      'create',
      '--scope',
      'weekly',
      '--parent',
      quarterlyId,
      '--title',
      'Draft the launch',
    ]);
    expectCode(weekly);
    expect(weekly.stdout).toBe('Created weekly goal goal_2.\n');
    const weeklyId = createdId(weekly.stdout);

    const daily = await harness.run([
      'goal',
      'create',
      '--scope',
      'daily',
      '--parent',
      weeklyId,
      '--day',
      'tue',
      '--title',
      'Call the printer',
    ]);
    expectCode(daily);
    expect(daily.stdout).toBe('Created daily goal goal_3.\n');
    const dailyId = createdId(daily.stdout);

    const adhoc = await harness.run([
      'goal',
      'create',
      '--scope',
      'adhoc',
      '--initiative',
      initiativeId,
      '--title',
      'Book the venue',
    ]);
    expectCode(adhoc);
    expect(adhoc.stdout).toBe('Created adhoc goal goal_4.\n');
    const adhocId = createdId(adhoc.stdout);

    expect(backend.ops().slice(-4)).toEqual([
      {
        op: 'goal.create',
        args: { scope: 'quarterly', title: 'Ship the beta', year: 2026, quarter: 3 },
      },
      {
        op: 'goal.create',
        args: { scope: 'weekly', title: 'Draft the launch', week: 32, parentId: quarterlyId },
      },
      {
        op: 'goal.create',
        args: {
          scope: 'daily',
          title: 'Call the printer',
          week: 32,
          parentId: weeklyId,
          dayOfWeek: 2,
        },
      },
      {
        op: 'goal.create',
        args: {
          scope: 'adhoc',
          title: 'Book the venue',
          year: 2026,
          week: 32,
          initiativeId,
        },
      },
    ]);

    // Read every scope in text, then one in JSON.
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
          '32',
        ])
      ).stdout
    ).toBe(
      [
        '  ID      STATUS  PERIOD       TITLE',
        '  goal_2  [ ]     2026 Q3 W32  Draft the launch',
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
          '32',
        ])
      ).stdout
    ).toBe(
      [
        '  ID      STATUS  PERIOD           TITLE',
        '  goal_3  [ ]     2026 Q3 W32 Tue  Call the printer',
        '',
      ].join('\n')
    );
    expect((await harness.run(['goal', 'list', '--scope', 'adhoc', '--year', '2026'])).stdout).toBe(
      ['  ID      STATUS  PERIOD    TITLE', '  goal_4  [ ]     2026 W32  Book the venue', ''].join(
        '\n'
      )
    );

    const weeklyJson = await harness.run([
      'goal',
      'list',
      '--scope',
      'weekly',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--week',
      '32',
      '--json',
    ]);
    expectCode(weeklyJson);
    expect(JSON.parse(weeklyJson.stdout)).toEqual([
      {
        id: weeklyId,
        scope: 'weekly',
        title: 'Draft the launch',
        isComplete: false,
        year: 2026,
        quarter: 3,
        week: 32,
        parentId: quarterlyId,
      },
    ]);

    // The weekly goal's id from the list output is the id `get` accepts.
    const detail = await harness.run(['goal', 'get', weeklyId]);
    expectCode(detail);
    expect(detail.stdout).toBe(
      [
        'ID:      goal_2',
        'Title:   Draft the launch',
        'Scope:   weekly',
        'Status:  incomplete',
        'Period:  2026 Q3 W32',
        'Parent:  Ship the beta (goal_1)',
        '',
        'Children:',
        '  [ ] goal_3  Call the printer',
        '',
      ].join('\n')
    );

    // Complete and reopen the daily goal in one week; the id comes from the CLI output.
    const complete = await harness.run(['goal', 'complete', dailyId, '--week', '32']);
    expectCode(complete);
    expect(complete.stdout).toBe(`Goal ${dailyId} is now complete.\n`);
    expect(backend.ops().at(-1)).toEqual({
      op: 'goal.setComplete',
      args: { id: dailyId, isComplete: true, week: 32 },
    });

    const reopen = await harness.run(['goal', 'reopen', dailyId, '--week', '32']);
    expectCode(reopen);
    expect(reopen.stdout).toBe(`Goal ${dailyId} is now incomplete.\n`);

    // Completing the quarterly goal with its children needs no week.
    const parentComplete = await harness.run([
      'goal',
      'complete',
      quarterlyId,
      '--include-children',
    ]);
    expectCode(parentComplete);
    expect(parentComplete.stdout).toBe(`Goal ${quarterlyId} is now complete.\n`);
    expect(backend.ops().slice(-2)).toEqual([
      { op: 'goal.get', args: { id: quarterlyId } },
      {
        op: 'goal.setComplete',
        args: { id: quarterlyId, isComplete: true, includeChildren: true },
      },
    ]);

    const rename = await harness.run(['goal', 'rename', weeklyId, '--title', 'Draft and ship']);
    expectCode(rename);
    expect(rename.stdout).toBe(`Renamed goal ${weeklyId}.\n`);

    // Initiatives: the adhoc goal is tagged, so `get` lists it.
    expect((await harness.run(['initiative', 'list'])).stdout).toBe(
      ['  ID      START       END  TITLE', `  ${initiativeId}  2026-01-05  -    Launch`, ''].join(
        '\n'
      )
    );
    expect((await harness.run(['initiative', 'get', initiativeId])).stdout).toBe(
      [
        'ID:     init_1',
        'Title:  Launch',
        'Start:  2026-01-05',
        '',
        'Description:',
        '  Faster launch',
        '',
        'Goals:',
        '  ID      STATUS  PERIOD    TITLE',
        `  ${adhocId}  [ ]     2026 W32  Book the venue`,
        '',
      ].join('\n')
    );

    // Deleting the quarterly goal removes every descendant.
    const deleted = await harness.run(['goal', 'delete', quarterlyId, '--yes']);
    expectCode(deleted);
    expect(deleted.stdout).toBe(`Deleted goal ${quarterlyId} and all of its child goals.\n`);
    // The quarterly goal, its weekly child and daily grandchild are gone; the adhoc goal is a
    // separate root, so it survives and still lists under its own scope.
    expect(backend.goals()).toEqual([
      {
        id: adhocId,
        scope: 'adhoc',
        title: 'Book the venue',
        isComplete: false,
        year: 2026,
        week: 32,
        initiativeId,
      },
    ]);
    expect((await harness.run(['goal', 'list', '--year', '2026', '--quarter', '3'])).stdout).toBe(
      'No goals found.\n'
    );
    expect((await harness.run(['goal', 'list', '--scope', 'adhoc', '--year', '2026'])).stdout).toBe(
      ['  ID      STATUS  PERIOD    TITLE', '  goal_4  [ ]     2026 W32  Book the venue', ''].join(
        '\n'
      )
    );
  });
});
