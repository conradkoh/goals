import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  MultipleQuarterlyGoalsSummary,
  QuarterlyGoalSummary,
} from '@workspace/backend/src/usecase/getWeekDetails';
import { Settings } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  generateMultipleQuarterlyGoalsMarkdown,
  generateQuarterlySummaryMarkdown,
} from './quarterlyMarkdown';

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

describe('quarterly markdown characterization (webapp)', () => {
  const originalZone = Settings.defaultZone;
  const originalLocale = Settings.defaultLocale;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(matrix.now));
    Settings.defaultLocale = 'en-US';
  });
  afterEach(() => {
    vi.useRealTimers();
    Settings.defaultZone = originalZone;
    Settings.defaultLocale = originalLocale;
  });

  for (const zone of matrix.zones) {
    for (const c of matrix.cases) {
      it(`${c.name} in ${zone.id}`, () => {
        Settings.defaultZone = zone.id;
        const data = readJson(c.fixture);
        const out =
          c.generator === 'quarter'
            ? generateQuarterlySummaryMarkdown(data as unknown as QuarterlyGoalSummary, {
                omitIncomplete: c.omitIncomplete,
              })
            : generateMultipleQuarterlyGoalsMarkdown(
                data as unknown as MultipleQuarterlyGoalsSummary,
                {
                  omitIncomplete: c.omitIncomplete,
                }
              );
        return expect(out).toMatchFileSnapshot(
          path.join(FIXTURES, 'golden', `${c.name}.${zone.label}.md`)
        );
      });
    }
  }
});
