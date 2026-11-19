import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  MultipleQuarterlyGoalsSummary,
  QuarterlyGoalSummary,
} from '@workspace/backend/src/usecase/getWeekDetails';
import {
  generateMultipleQuarterlyGoalsMarkdown,
  generateQuarterlySummaryMarkdown,
  type MarkdownQuarterlyGoalSummary,
  type MarkdownQuarterSummary,
} from '@workspace/shared/utilities/quarterly-markdown';
import { describe, expect, expectTypeOf, it } from 'vitest';

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../packages/shared/src/utilities/quarterly-markdown/__fixtures__'
);
const readJson = (rel: string) => JSON.parse(readFileSync(path.join(FIXTURES, rel), 'utf8'));
const matrix = readJson('cases.json') as {
  now: string;
  zones: { id: string; label: string }[];
  cases: {
    name: string;
    fixture: string;
    generator: 'quarter' | 'multi';
    omitIncomplete: boolean;
  }[];
};

describe('quarterly markdown (webapp consumption of shared generator)', () => {
  for (const zone of matrix.zones) {
    for (const c of matrix.cases) {
      it(`${c.name} in ${zone.id}`, () => {
        const data = readJson(c.fixture);
        const out =
          c.generator === 'quarter'
            ? generateQuarterlySummaryMarkdown(data as unknown as QuarterlyGoalSummary, {
                omitIncomplete: c.omitIncomplete,
                now: Date.parse(matrix.now),
                timeZone: zone.id,
              })
            : generateMultipleQuarterlyGoalsMarkdown(
                data as unknown as MultipleQuarterlyGoalsSummary,
                {
                  omitIncomplete: c.omitIncomplete,
                  now: Date.parse(matrix.now),
                  timeZone: zone.id,
                }
              );
        const golden = readFileSync(
          path.join(FIXTURES, 'golden', `${c.name}.${zone.label}.md`),
          'utf8'
        );
        expect(out).toBe(golden);
      });
    }
  }

  it('backend summaries stay assignable to the shared structural types', () => {
    expectTypeOf<MultipleQuarterlyGoalsSummary>().toExtend<MarkdownQuarterSummary>();
    expectTypeOf<QuarterlyGoalSummary>().toExtend<MarkdownQuarterlyGoalSummary>();
  });
});
