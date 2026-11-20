import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
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

const COMPLETED_AT = Date.UTC(2026, 7, 15);
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

/** Weeks 1-13, 14-26, 27-39 and 40-53 of 2026, as the backend's `getQuarterWeeks` reports them. */
const Q1_RANGE = { startWeek: 1, endWeek: 13 };
const Q2_RANGE = { startWeek: 14, endWeek: 26 };
const Q3_RANGE = { startWeek: 27, endWeek: 39 };
const Q4_RANGE = { startWeek: 40, endWeek: 53 };

/** One empty quarter summary: the fake answers exactly this when nothing is seeded. */
function emptyQuarter(
  year: number,
  quarter: number,
  weekRange: typeof Q1_RANGE
): MarkdownQuarterSummary {
  return { quarterlyGoals: [], year, quarter, weekRange };
}

const EMPTY_Q2 = emptyQuarter(2026, 2, Q2_RANGE);
const EMPTY_Q4 = emptyQuarter(2026, 4, Q4_RANGE);

/** The literal Q1 document body for the two-quarter fixture. */
const Q1_SUMMARY: MarkdownQuarterSummary = {
  quarterlyGoals: [
    {
      quarterlyGoal: { title: 'Ship v1', isComplete: false },
      weeklyGoalsByWeek: {
        3: [
          {
            title: 'Plan the release',
            isComplete: false,
            children: [{ title: 'Write the spec', isComplete: false }],
          },
        ],
      },
      quarter: 1,
      year: 2026,
      weekRange: Q1_RANGE,
    },
  ],
  year: 2026,
  quarter: 1,
  weekRange: Q1_RANGE,
};

/** The literal Q3 document body for the two-quarter fixture. */
const Q3_SUMMARY: MarkdownQuarterSummary = {
  quarterlyGoals: [
    {
      quarterlyGoal: { title: 'Launch beta', isComplete: false },
      weeklyGoalsByWeek: {
        32: [
          {
            title: 'Draft the launch',
            isComplete: false,
            children: [{ title: 'Call the printer', isComplete: false }],
          },
        ],
      },
      quarter: 3,
      year: 2026,
      weekRange: Q3_RANGE,
    },
  ],
  year: 2026,
  quarter: 3,
  weekRange: Q3_RANGE,
};

/** Adhoc goals of Q3 2026 in week order, as the fake projects them. */
const Q3_ADHOC: MarkdownAdhocGoal[] = [
  { title: 'Book the venue', isComplete: false, adhoc: { weekNumber: 30 } },
  { title: 'Fix the typo', isComplete: false, adhoc: { weekNumber: 33 } },
];

/** Seeds one quarterly goal in Q1 and one in Q3, each with a weekly child and a daily grandchild. */
function seedTwoQuarters(backend: FakeBackend): void {
  const q1 = backend.seedGoal({ scope: 'quarterly', title: 'Ship v1', year: 2026, quarter: 1 });
  const q1Weekly = backend.seedGoal({
    scope: 'weekly',
    title: 'Plan the release',
    year: 2026,
    quarter: 1,
    week: 3,
    parentId: q1,
  });
  backend.seedGoal({
    scope: 'daily',
    title: 'Write the spec',
    year: 2026,
    quarter: 1,
    week: 3,
    dayOfWeek: 2,
    parentId: q1Weekly,
  });
  const q3 = backend.seedGoal({ scope: 'quarterly', title: 'Launch beta', year: 2026, quarter: 3 });
  const q3Weekly = backend.seedGoal({
    scope: 'weekly',
    title: 'Draft the launch',
    year: 2026,
    quarter: 3,
    week: 32,
    parentId: q3,
  });
  backend.seedGoal({
    scope: 'daily',
    title: 'Call the printer',
    year: 2026,
    quarter: 3,
    week: 32,
    dayOfWeek: 2,
    parentId: q3Weekly,
  });
}

/** The exact document the webapp generator produces for a literal summary and the harness clock. */
function quarterDocument(
  summary: MarkdownQuarterSummary,
  harness: Harness,
  omitIncomplete = false
): string {
  return generateMultipleQuarterlyGoalsMarkdown(summary, {
    omitIncomplete,
    now: harness.clock.now,
  });
}

describe('goals export markdown usage errors', () => {
  const CASES: [string, string[], string][] = [
    ['missing --year', [], '--year is required for export'],
    ['--quarter without --year', ['--quarter', '3'], '--year is required for export'],
    [
      '--quarter 0',
      ['--year', '2026', '--quarter', '0'],
      '--quarter must be an integer from 1 to 4',
    ],
    [
      '--quarter 5',
      ['--year', '2026', '--quarter', '5'],
      '--quarter must be an integer from 1 to 4',
    ],
    [
      '--quarter x',
      ['--year', '2026', '--quarter', 'x'],
      '--quarter must be an integer from 1 to 4',
    ],
    [
      '--goal without --quarter',
      ['--year', '2026', '--goal', 'goal_1'],
      '--goal requires --quarter (a goal belongs to exactly one quarter)',
    ],
    [
      '--domain with --no-adhoc',
      ['--year', '2026', '--domain', 'u', '--no-adhoc'],
      '--domain cannot be combined with --no-adhoc',
    ],
    ['unknown flag', ['--year', '2026', '--bogus'], "Unknown option '--bogus'"],
    ['--out without a value', ['--year', '2026', '--out'], 'argument missing'],
    ['--out with an empty value', ['--year', '2026', '--out', ''], '--out must not be empty'],
    [
      '--goal with an empty value',
      ['--year', '2026', '--quarter', '3', '--goal', ''],
      '--goal must not be empty',
    ],
    ['an extra positional', ['--year', '2026', 'extra'], "unexpected argument 'extra'"],
  ];

  it.each(CASES)('rejects %s before reading credentials', async (_name, argv, message) => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['export', 'markdown', ...argv]);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain(message);
    expect(result.stderr).toContain('goals export markdown --help');
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
    expect(backend.requests).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });
});

describe('goals export markdown for one quarter', () => {
  it('prints the quarter document and includes adhoc goals by default', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    backend.seedGoal({
      scope: 'adhoc',
      title: 'Book the venue',
      year: 2026,
      week: 30,
      domainId: 'dom_a',
    });
    backend.seedGoal({ scope: 'adhoc', title: 'Fix the typo', year: 2026, week: 33 });
    backend.seedGoal({ scope: 'adhoc', title: 'Q2 errand', year: 2026, week: 20 });

    const result = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '3']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(quarterDocument({ ...Q3_SUMMARY, adhocGoals: Q3_ADHOC }, harness));
    expect(result.stdout).toContain('# Q3 2026 Multi-Goal Summary');
    expect(result.stdout).toContain('### Goal 1: [ ] Launch beta');
    expect(result.stdout).toContain('**Adhoc Goals Included:** 2');
    expect(result.stdout).not.toContain('Q2 errand');
    expect(result.stdout.endsWith('*')).toBe(true);
    expect(backend.ops()).toEqual([
      { op: 'export.quarterSummary', args: { year: 2026, quarter: 3, includeAdhoc: true } },
    ]);
  });

  it('applies --completed-only on the client and sends no extra key', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const quarterly = backend.seedGoal({
      scope: 'quarterly',
      title: 'Launch beta',
      year: 2026,
      quarter: 3,
      isComplete: true,
      completedAt: COMPLETED_AT,
    });
    const weekly = backend.seedGoal({
      scope: 'weekly',
      title: 'Draft the launch',
      year: 2026,
      quarter: 3,
      week: 32,
      parentId: quarterly,
    });
    backend.seedGoal({
      scope: 'daily',
      title: 'Call the printer',
      year: 2026,
      quarter: 3,
      week: 32,
      parentId: weekly,
    });
    const summary: MarkdownQuarterSummary = {
      quarterlyGoals: [
        {
          quarterlyGoal: {
            title: 'Launch beta',
            isComplete: true,
            completedAt: COMPLETED_AT,
          },
          weeklyGoalsByWeek: {
            32: [
              {
                title: 'Draft the launch',
                isComplete: false,
                children: [{ title: 'Call the printer', isComplete: false }],
              },
            ],
          },
          quarter: 3,
          year: 2026,
          weekRange: Q3_RANGE,
        },
      ],
      year: 2026,
      quarter: 3,
      weekRange: Q3_RANGE,
    };

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--completed-only',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(quarterDocument(summary, harness, true));
    expect(result.stdout).toContain('**Note:** Only completed goals are shown');
    expect(result.stdout).not.toContain('Draft the launch');
    expect(backend.ops()).toEqual([
      { op: 'export.quarterSummary', args: { year: 2026, quarter: 3, includeAdhoc: true } },
    ]);
  });

  it('sends includeAdhoc false and drops the adhoc section with --no-adhoc', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    backend.seedGoal({ scope: 'adhoc', title: 'Book the venue', year: 2026, week: 30 });

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--no-adhoc',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(quarterDocument(Q3_SUMMARY, harness));
    expect(result.stdout).not.toContain('Adhoc Goals');
    expect(backend.ops()).toEqual([
      { op: 'export.quarterSummary', args: { year: 2026, quarter: 3, includeAdhoc: false } },
    ]);
  });

  it('sends every --goal id and narrows the document to those goals', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const first = backend.seedGoal({
      scope: 'quarterly',
      title: 'Launch beta',
      year: 2026,
      quarter: 3,
    });
    const second = backend.seedGoal({
      scope: 'quarterly',
      title: 'Grow revenue',
      year: 2026,
      quarter: 3,
    });

    const both = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      first,
      '--goal',
      second,
    ]);

    expect(both.code).toBe(0);
    expect(both.stdout).toContain('Launch beta');
    expect(both.stdout).toContain('Grow revenue');
    expect(backend.ops().at(-1)).toEqual({
      op: 'export.quarterSummary',
      args: { year: 2026, quarter: 3, goalIds: [first, second], includeAdhoc: true },
    });

    const onlyFirst = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      first,
    ]);

    expect(onlyFirst.code).toBe(0);
    expect(backend.ops().at(-1)).toEqual({
      op: 'export.quarterSummary',
      args: { year: 2026, quarter: 3, goalIds: [first], includeAdhoc: true },
    });
    const oneGoal: MarkdownQuarterSummary = {
      quarterlyGoals: [
        {
          quarterlyGoal: { title: 'Launch beta', isComplete: false },
          weeklyGoalsByWeek: {},
          quarter: 3,
          year: 2026,
          weekRange: Q3_RANGE,
        },
      ],
      year: 2026,
      quarter: 3,
      weekRange: Q3_RANGE,
    };
    expect(onlyFirst.stdout).toBe(quarterDocument(oneGoal, harness));
    expect(onlyFirst.stdout).not.toContain('Grow revenue');
  });

  it('maps uncategorized and passes domain ids through', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedGoal({ scope: 'quarterly', title: 'Launch beta', year: 2026, quarter: 3 });
    backend.seedGoal({ scope: 'adhoc', title: 'Book the venue', year: 2026, week: 30 });
    backend.seedGoal({
      scope: 'adhoc',
      title: 'Fix the typo',
      year: 2026,
      week: 31,
      domainId: 'dom_x',
    });
    backend.seedGoal({
      scope: 'adhoc',
      title: 'Buy pencils',
      year: 2026,
      week: 32,
      domainId: 'dom_y',
    });

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--domain',
      'Uncategorized',
      '--domain',
      'dom_x',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops().at(-1)).toEqual({
      op: 'export.quarterSummary',
      args: {
        year: 2026,
        quarter: 3,
        includeAdhoc: true,
        adhocDomainIds: ['UNCATEGORIZED', 'dom_x'],
      },
    });
    const filtered: MarkdownAdhocGoal[] = [
      { title: 'Book the venue', isComplete: false, adhoc: { weekNumber: 30 } },
      { title: 'Fix the typo', isComplete: false, adhoc: { weekNumber: 31 } },
    ];
    const expected: MarkdownQuarterSummary = {
      quarterlyGoals: [
        {
          quarterlyGoal: { title: 'Launch beta', isComplete: false },
          weeklyGoalsByWeek: {},
          quarter: 3,
          year: 2026,
          weekRange: Q3_RANGE,
        },
      ],
      adhocGoals: filtered,
      year: 2026,
      quarter: 3,
      weekRange: Q3_RANGE,
    };
    expect(result.stdout).toBe(quarterDocument(expected, harness));
    expect(result.stdout).toContain('Fix the typo');
    expect(result.stdout).not.toContain('Buy pencils');
  });
});

describe('goals export markdown for a year', () => {
  it('requests Q1..Q4 in order and prints the year document', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);

    const result = await harness.run(['export', 'markdown', '--year', '2026']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      generateYearMarkdown(
        2026,
        [
          { quarter: 1, summary: Q1_SUMMARY },
          { quarter: 2, summary: EMPTY_Q2 },
          { quarter: 3, summary: Q3_SUMMARY },
          { quarter: 4, summary: EMPTY_Q4 },
        ],
        { now: harness.clock.now }
      )
    );
    expect(result.stdout).toContain('**Quarters with goals:** Q1, Q3');
    expect(result.stdout).toContain('**No goals:** Q2, Q4');
    expect(backend.ops()).toEqual(
      [1, 2, 3, 4].map((quarter) => ({
        op: 'export.quarterSummary',
        args: { year: 2026, quarter, includeAdhoc: true },
      }))
    );

    const q1 = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '1']);
    const q3 = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '3']);
    expect(q1.code).toBe(0);
    expect(q3.code).toBe(0);
    expect(result.stdout).toContain(q1.stdout);
    expect(result.stdout).toContain(q3.stdout);
  });

  it('adds the completed-only note to the year heading', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    backend.seedGoal({
      scope: 'quarterly',
      title: 'Launch beta',
      year: 2026,
      quarter: 3,
      isComplete: true,
      completedAt: COMPLETED_AT,
    });

    const result = await harness.run(['export', 'markdown', '--year', '2026', '--completed-only']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('**Note:** Only completed goals are shown');
    expect(result.stderr).toBe('');
  });

  it('applies a domain filter to every quarter of a year export', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    backend.seedGoal({ scope: 'adhoc', title: 'Book the venue', year: 2026, week: 30 });

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--domain',
      'uncategorized',
    ]);

    expect(result.code).toBe(0);
    expect(backend.ops()).toEqual(
      [1, 2, 3, 4].map((quarter) => ({
        op: 'export.quarterSummary',
        args: {
          year: 2026,
          quarter,
          includeAdhoc: true,
          adhocDomainIds: ['UNCATEGORIZED'],
        },
      }))
    );
    expect(result.stdout).toContain('Book the venue');
  });
});

describe('goals export markdown empty states', () => {
  it('prints the empty quarter document and notes it on stderr', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '4']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(quarterDocument(emptyQuarter(2026, 4, Q4_RANGE), harness));
    expect(result.stderr).toBe('No goals found for Q4 2026\n');
    expect(backend.ops()).toHaveLength(1);
  });

  it('prints the all-empty year document and notes it on stderr', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run(['export', 'markdown', '--year', '2026']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      generateYearMarkdown(
        2026,
        [
          { quarter: 1, summary: emptyQuarter(2026, 1, Q1_RANGE) },
          { quarter: 2, summary: EMPTY_Q2 },
          { quarter: 3, summary: emptyQuarter(2026, 3, Q3_RANGE) },
          { quarter: 4, summary: EMPTY_Q4 },
        ],
        { now: harness.clock.now }
      )
    );
    expect(result.stdout).toContain('*No goals found for 2026.*');
    expect(result.stderr).toBe('No goals found for 2026\n');
    expect(backend.ops()).toHaveLength(4);
  });

  it('writes no stderr note when only some quarters are empty', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);

    const result = await harness.run(['export', 'markdown', '--year', '2026']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
  });
});

describe('goals export markdown failures', () => {
  it('reports another user goal id as not found', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const foreign = backend.seedGoal({
      ownerUserId: 'user_2',
      scope: 'quarterly',
      title: 'Foreign goal',
      year: 2026,
      quarter: 3,
    });

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      foreign,
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Not found\n');
  });

  it('reports a goal of another quarter as not found', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    const firstQuarter = backend.seedGoal({
      scope: 'quarterly',
      title: 'Ship v1',
      year: 2026,
      quarter: 1,
    });

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      firstQuarter,
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Not found\n');
  });

  it('reports an unknown goal id as not found', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      'goal_999',
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Not found\n');
    expect(backend.ops()).toHaveLength(1);
  });

  it('stops before printing or writing when a later quarter fails', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    backend.failNextCall({ status: 500, code: 'internal', message: 'Boom' }, 1);
    const outPath = join(harness.dir, 'year.md');

    const result = await harness.run(['export', 'markdown', '--year', '2026', '--out', outPath]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Boom\n');
    expect(existsSync(outPath)).toBe(false);
    expect(backend.ops().map((op) => (op.args as { quarter: number }).quarter)).toEqual([1, 2]);
  });
});

describe('goals export markdown --out', () => {
  it('writes exactly the stdout bytes and leaves no temp file behind', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    const outPath = join(harness.dir, 'q3.md');

    const toStdout = await harness.run(['export', 'markdown', '--year', '2026', '--quarter', '3']);
    const toFile = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--out',
      outPath,
    ]);

    expect(toFile.code).toBe(0);
    expect(toFile.stdout).toBe('');
    expect(toFile.stderr).toBe(`Wrote ${outPath}\n`);
    expect(readFileSync(outPath, 'utf8')).toBe(toStdout.stdout);
    expect(readdirSync(harness.dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('replaces an existing file only on success', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    const outPath = join(harness.dir, 'q3.md');
    writeFileSync(outPath, 'old content');

    const replaced = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--out',
      outPath,
    ]);

    expect(replaced.code).toBe(0);
    expect(readFileSync(outPath, 'utf8')).toContain('# Q3 2026 Multi-Goal Summary');

    writeFileSync(outPath, 'old content');
    const neverCreated = join(harness.dir, 'never.md');
    const failed = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      'goal_999',
      '--out',
      outPath,
    ]);

    expect(failed.code).toBe(1);
    expect(readFileSync(outPath, 'utf8')).toBe('old content');

    const failedNew = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--goal',
      'goal_999',
      '--out',
      neverCreated,
    ]);

    expect(failedNew.code).toBe(1);
    expect(existsSync(neverCreated)).toBe(false);
    expect(readdirSync(harness.dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('reports a missing directory without creating anything', async () => {
    const { backend, harness } = createWorld();
    await signIn(harness);
    seedTwoQuarters(backend);
    const outPath = join(harness.dir, 'missing', 'q3.md');

    const result = await harness.run([
      'export',
      'markdown',
      '--year',
      '2026',
      '--quarter',
      '3',
      '--out',
      outPath,
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('Could not write ')).toBe(true);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
    expect(existsSync(join(harness.dir, 'missing'))).toBe(false);
  });
});
