import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';
import type {
  MarkdownAdhocGoal,
  MarkdownQuarterSummary,
} from '../vendor/quarterly-markdown/index.js';
import {
  generateMultipleQuarterlyGoalsMarkdown,
  generateYearMarkdown,
} from '../vendor/quarterly-markdown/index.js';

const LOGIN_ARGS = [
  'auth',
  'login',
  '--webapp-url',
  'https://goals.example.com',
  '--convex-url',
  'https://example-123.convex.site',
];

/** Local Monday noon, 3 August 2026: ISO week 2026 W32 in every zone. */
const NOW = new Date(2026, 7, 3, 12).getTime();
const cleanups: (() => void)[] = [];

function createWorld(): { backend: FakeBackend; harness: Harness } {
  const clock = { now: NOW };
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

interface Scripted {
  q1: string;
  q3: string;
}

/**
 * Login, create the goals through the CLI (only the domain-bearing adhoc goal is seeded, because
 * the CLI cannot create domains), then complete the Q3 quarterly goal with its children.
 */
async function scriptGoals(harness: Harness, backend: FakeBackend): Promise<Scripted> {
  expect((await harness.run(LOGIN_ARGS)).code).toBe(0);

  const q1 = await harness.run([
    'goal',
    'create',
    '--scope',
    'quarterly',
    '--year',
    '2026',
    '--quarter',
    '1',
    '--title',
    'Ship v1',
  ]);
  expectCode(q1);
  const q1Id = createdId(q1.stdout);

  const q1Weekly = await harness.run([
    'goal',
    'create',
    '--scope',
    'weekly',
    '--parent',
    q1Id,
    '--week',
    '3',
    '--title',
    'Plan the release',
  ]);
  expectCode(q1Weekly);

  const q3 = await harness.run([
    'goal',
    'create',
    '--scope',
    'quarterly',
    '--year',
    '2026',
    '--quarter',
    '3',
    '--title',
    'Launch beta',
  ]);
  expectCode(q3);
  const q3Id = createdId(q3.stdout);

  const q3Weekly = await harness.run([
    'goal',
    'create',
    '--scope',
    'weekly',
    '--parent',
    q3Id,
    '--week',
    '32',
    '--title',
    'Draft the launch',
  ]);
  expectCode(q3Weekly);

  const adhoc = await harness.run([
    'goal',
    'create',
    '--scope',
    'adhoc',
    '--year',
    '2026',
    '--week',
    '33',
    '--title',
    'Fix the typo',
  ]);
  expectCode(adhoc);

  // The CLI cannot create a domain, so the domain-bearing adhoc goal is seeded directly.
  backend.seedGoal({
    scope: 'adhoc',
    title: 'Book the venue',
    year: 2026,
    week: 30,
    domainId: 'dom_events',
  });

  const completed = await harness.run(['goal', 'complete', q3Id, '--include-children']);
  expectCode(completed);

  return { q1: q1Id, q3: q3Id };
}

/** The literal Q1 body: one incomplete quarterly goal with one incomplete weekly child. */
const Q1_SUMMARY: MarkdownQuarterSummary = {
  quarterlyGoals: [
    {
      quarterlyGoal: { title: 'Ship v1', isComplete: false },
      weeklyGoalsByWeek: {
        3: [{ title: 'Plan the release', isComplete: false, children: [] }],
      },
      quarter: 1,
      year: 2026,
      weekRange: { startWeek: 1, endWeek: 13 },
    },
  ],
  year: 2026,
  quarter: 1,
  weekRange: { startWeek: 1, endWeek: 13 },
};

const Q3_RANGE = { startWeek: 27, endWeek: 39 };

/** The literal Q3 adhoc goals, in week order (both created before `now` was stamped). */
const Q3_ADHOC: MarkdownAdhocGoal[] = [
  { title: 'Book the venue', isComplete: false, adhoc: { weekNumber: 30 } },
  { title: 'Fix the typo', isComplete: false, adhoc: { weekNumber: 33 } },
];

/** The literal Q3 body: the quarterly goal completed with its weekly child. */
const Q3_SUMMARY: MarkdownQuarterSummary = {
  quarterlyGoals: [
    {
      quarterlyGoal: { title: 'Launch beta', isComplete: true, completedAt: NOW },
      weeklyGoalsByWeek: {
        32: [{ title: 'Draft the launch', isComplete: true, children: [] }],
      },
      quarter: 3,
      year: 2026,
      weekRange: Q3_RANGE,
    },
  ],
  adhocGoals: Q3_ADHOC,
  year: 2026,
  quarter: 3,
  weekRange: Q3_RANGE,
};

const EMPTY_Q2: MarkdownQuarterSummary = {
  quarterlyGoals: [],
  year: 2026,
  quarter: 2,
  weekRange: { startWeek: 14, endWeek: 26 },
};

const EMPTY_Q4: MarkdownQuarterSummary = {
  quarterlyGoals: [],
  year: 2026,
  quarter: 4,
  weekRange: { startWeek: 40, endWeek: 53 },
};

/** The year input every generation uses, in ascending quarter order. */
function yearQuarters(
  q3: MarkdownQuarterSummary
): { quarter: 1 | 2 | 3 | 4; summary: MarkdownQuarterSummary }[] {
  return [
    { quarter: 1, summary: Q1_SUMMARY },
    { quarter: 2, summary: EMPTY_Q2 },
    { quarter: 3, summary: q3 },
    { quarter: 4, summary: EMPTY_Q4 },
  ];
}

describe('export markdown end to end', () => {
  it('exports the same markdown as the shared generator for CLI-created goals', async () => {
    const { backend, harness } = createWorld();
    const { q3: q3Id } = await scriptGoals(harness, backend);

    // Quarter-only: adhoc goals are included by default.
    const quarter = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '3']);
    expectCode(quarter);
    expect(quarter.stdout).toBe(
      generateMultipleQuarterlyGoalsMarkdown(Q3_SUMMARY, { now: harness.clock.now })
    );

    // Year-only: Q1 and Q3 bodies, Q2 and Q4 listed as empty.
    const year = await harness.run(['export', 'markdown', '--year', '2026']);
    expectCode(year);
    expect(year.stdout).toBe(
      generateYearMarkdown(2026, yearQuarters(Q3_SUMMARY), { now: harness.clock.now })
    );
    expect(year.stdout).toContain('**Quarters with goals:** Q1, Q3');
    expect(year.stdout).toContain('**No goals:** Q2, Q4');

    // Completed-only: client-side filtering, plus the year heading note.
    const completed = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--completed-only',
    ]);
    expectCode(completed);
    expect(completed.stdout).toBe(
      generateYearMarkdown(2026, yearQuarters(Q3_SUMMARY), {
        omitIncomplete: true,
        now: harness.clock.now,
      })
    );
    expect(completed.stdout).toContain('**Note:** Only completed goals are shown');

    // No adhoc: the adhoc section disappears from both quarters that could have one.
    const noAdhoc = await harness.run(['export', 'markdown', '--year', '2026', '--no-adhoc']);
    expectCode(noAdhoc);
    expect(noAdhoc.stdout).toBe(
      generateYearMarkdown(2026, yearQuarters({ ...Q3_SUMMARY, adhocGoals: undefined }), {
        now: harness.clock.now,
      })
    );
    expect(noAdhoc.stdout).not.toContain('Adhoc Goals');

    // Domain filter: only the uncategorized adhoc goal survives.
    const uncategorized = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--domain',
      'uncategorized',
    ]);
    expectCode(uncategorized);
    expect(uncategorized.stdout).toBe(
      generateMultipleQuarterlyGoalsMarkdown(
        { ...Q3_SUMMARY, adhocGoals: [Q3_ADHOC[1] ?? Q3_ADHOC[0]] },
        { now: harness.clock.now }
      )
    );
    expect(uncategorized.stdout).toContain('Fix the typo');
    expect(uncategorized.stdout).not.toContain('Book the venue');

    // --out: the file gets exactly the quarter document, stdout stays empty.
    const outPath = join(harness.dir, 'q3-2026.md');
    const written = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--out',
      outPath,
    ]);
    expect(written.code).toBe(0);
    expect(written.stdout).toBe('');
    expect(written.stderr).toBe(`Wrote ${outPath}\n`);
    expect(readFileSync(outPath, 'utf8')).toBe(
      generateMultipleQuarterlyGoalsMarkdown(Q3_SUMMARY, { now: harness.clock.now })
    );

    // A second Q3 goal makes --goal narrowing visible; it runs last so it cannot leak into the
    // earlier year documents.
    seedSecondQuarterly(backend);
    const singleGoal = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      q3Id,
    ]);
    expectCode(singleGoal);
    expect(singleGoal.stdout).toBe(
      generateMultipleQuarterlyGoalsMarkdown(Q3_SUMMARY, { now: harness.clock.now })
    );
    expect(singleGoal.stdout).toContain('Launch beta');
    expect(singleGoal.stdout).not.toContain('Grow revenue');
  });
});

/** Seeds a second Q3 quarterly goal after the scripted run, so --goal narrowing is visible. */
function seedSecondQuarterly(backend: FakeBackend): void {
  backend.seedGoal({
    scope: 'quarterly',
    title: 'Grow revenue',
    year: 2026,
    quarter: 3,
  });
}
