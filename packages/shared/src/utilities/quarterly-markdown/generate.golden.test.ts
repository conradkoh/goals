import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  generateMultipleQuarterlyGoalsMarkdown,
  generateQuarterlySummaryMarkdown,
} from './generate';
import type { MarkdownQuarterSummary, MarkdownQuarterlyGoalSummary } from './types';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');

const readJson = <T>(rel: string): T =>
  JSON.parse(readFileSync(path.join(FIXTURES, rel), 'utf8')) as T;

const matrix = readJson<{
  now: string;
  zones: { id: string; label: string }[];
  cases: {
    name: string;
    fixture: string;
    generator: 'quarter' | 'multi';
    omitIncomplete: boolean;
  }[];
}>('cases.json');

describe('shared quarterly markdown generator (characterization goldens)', () => {
  for (const zone of matrix.zones) {
    for (const c of matrix.cases) {
      it(`${c.name} in ${zone.id}`, () => {
        const data = readJson<unknown>(c.fixture);
        const out =
          c.generator === 'quarter'
            ? generateQuarterlySummaryMarkdown(data as MarkdownQuarterlyGoalSummary, {
                omitIncomplete: c.omitIncomplete,
                now: Date.parse(matrix.now),
                timeZone: zone.id,
              })
            : generateMultipleQuarterlyGoalsMarkdown(data as MarkdownQuarterSummary, {
                omitIncomplete: c.omitIncomplete,
                now: Date.parse(matrix.now),
                timeZone: zone.id,
              });
        const golden = readFileSync(
          path.join(FIXTURES, 'golden', `${c.name}.${zone.label}.md`),
          'utf8'
        );
        expect(out).toBe(golden);
      });
    }
  }
});
