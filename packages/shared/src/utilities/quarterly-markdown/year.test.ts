import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { generateMultipleQuarterlyGoalsMarkdown } from './generate';
import type { MarkdownQuarterSummary } from './types';
import { generateYearMarkdown, type YearQuarterInput } from './year';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const NOW = Date.UTC(2026, 10, 19, 12, 30);

const readJson = (rel: string): MarkdownQuarterSummary =>
  JSON.parse(readFileSync(path.join(FIXTURES, rel), 'utf8')) as MarkdownQuarterSummary;

const cloneWithQuarter = (rel: string, quarter: 1 | 2 | 3 | 4): MarkdownQuarterSummary => ({
  ...readJson(rel),
  quarter,
});

describe('generateYearMarkdown', () => {
  it('lists quarters with goals, names empty quarters, and renders bodies in order', () => {
    const q1 = cloneWithQuarter('multi.json', 1);
    const q2 = cloneWithQuarter('multi-empty.json', 2);
    const q3 = cloneWithQuarter('multi-adhoc-only.json', 3);
    const q4 = cloneWithQuarter('multi-empty.json', 4);
    const quarters: YearQuarterInput[] = [
      { quarter: 1, summary: q1 },
      { quarter: 2, summary: q2 },
      { quarter: 3, summary: q3 },
      { quarter: 4, summary: q4 },
    ];

    const out = generateYearMarkdown(2026, quarters, { now: NOW, timeZone: 'UTC' });

    expect(out).toContain('**Quarters with goals:** Q1, Q3');
    expect(out).toContain('**No goals:** Q2, Q4');
    expect(out).toContain('# Q1 2026 Multi-Goal Summary');
    expect(out).toContain('# Q3 2026 Multi-Goal Summary');
    expect(out).not.toContain('# Q2 2026 Multi-Goal Summary');
    expect(out).not.toContain('# Q4 2026 Multi-Goal Summary');
    expect(out.indexOf('# Q1 2026 Multi-Goal Summary')).toBeLessThan(
      out.indexOf('# Q3 2026 Multi-Goal Summary')
    );
  });

  it('renders each quarter body byte-identically to the standalone generator', () => {
    const q1 = cloneWithQuarter('multi.json', 1);
    const q3 = cloneWithQuarter('multi-adhoc-only.json', 3);
    const out = generateYearMarkdown(
      2026,
      [
        { quarter: 1, summary: q1 },
        { quarter: 3, summary: q3 },
      ],
      { now: NOW, timeZone: 'Pacific/Auckland' }
    );

    const body1 = generateMultipleQuarterlyGoalsMarkdown(q1, {
      now: NOW,
      timeZone: 'Pacific/Auckland',
    });
    const body3 = generateMultipleQuarterlyGoalsMarkdown(q3, {
      now: NOW,
      timeZone: 'Pacific/Auckland',
    });

    expect(out).toContain(body1);
    expect(out).toContain(body3);
    expect(out.indexOf(body1)).toBeLessThan(out.indexOf(body3));
  });

  it('renders only the header and the no-goals line for an all-empty year', () => {
    const out = generateYearMarkdown(
      2026,
      [
        { quarter: 1, summary: cloneWithQuarter('multi-empty.json', 1) },
        { quarter: 2, summary: cloneWithQuarter('multi-empty.json', 2) },
        { quarter: 3, summary: cloneWithQuarter('multi-empty.json', 3) },
        { quarter: 4, summary: cloneWithQuarter('multi-empty.json', 4) },
      ],
      { now: NOW, timeZone: 'UTC' }
    );

    expect(out).toBe(
      '# 2026 Goals Summary\n' +
        '\n' +
        '**Year:** 2026\n' +
        '**No goals:** Q1, Q2, Q3, Q4\n' +
        '\n' +
        '---\n' +
        '\n' +
        '*No goals found for 2026.*'
    );
  });

  it('adds the completed-only note when omitIncomplete is set', () => {
    const out = generateYearMarkdown(
      2026,
      [{ quarter: 2, summary: cloneWithQuarter('multi-empty.json', 2) }],
      { now: NOW, timeZone: 'UTC', omitIncomplete: true }
    );

    expect(out).toContain('**Note:** Only completed goals are shown');
    expect(out).toContain('*No goals found for 2026.*');
  });

  it('resolves the injected now a single time for every quarter footer', () => {
    const nowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(Date.UTC(2026, 10, 19, 12, 30))
      .mockReturnValueOnce(Date.UTC(2026, 10, 19, 12, 31))
      .mockReturnValueOnce(Date.UTC(2026, 10, 19, 12, 32));

    const out = generateYearMarkdown(
      2026,
      [
        { quarter: 1, summary: cloneWithQuarter('multi.json', 1) },
        { quarter: 3, summary: cloneWithQuarter('multi-adhoc-only.json', 3) },
      ],
      { timeZone: 'UTC' }
    );

    nowSpy.mockRestore();

    const footers = out.match(/\*Generated on [^*]+\*/g) ?? [];
    expect(footers).toHaveLength(2);
    expect(new Set(footers)).toEqual(new Set(['*Generated on Nov 19, 2026 at 12:30 PM*']));
  });

  it('renders quarters in ascending order regardless of input order', () => {
    const out = generateYearMarkdown(
      2026,
      [
        { quarter: 3, summary: cloneWithQuarter('multi-adhoc-only.json', 3) },
        { quarter: 1, summary: cloneWithQuarter('multi.json', 1) },
      ],
      { now: NOW, timeZone: 'UTC' }
    );

    expect(out.indexOf('# Q1 2026 Multi-Goal Summary')).toBeLessThan(
      out.indexOf('# Q3 2026 Multi-Goal Summary')
    );
  });
});
