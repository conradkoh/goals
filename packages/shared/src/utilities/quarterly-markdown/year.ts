import { generateMultipleQuarterlyGoalsMarkdown } from './generate';
import type { MarkdownQuarterSummary, QuarterlySummaryMarkdownOptions } from './types';

/** One quarter of a year summary: the quarter number plus its goals. */
export interface YearQuarterInput {
  quarter: 1 | 2 | 3 | 4;
  summary: MarkdownQuarterSummary;
}

const isEmptyQuarter = (summary: MarkdownQuarterSummary): boolean =>
  summary.quarterlyGoals.length === 0 && (summary.adhocGoals?.length ?? 0) === 0;

const quarterLabel = (entry: YearQuarterInput): string => `Q${entry.quarter}`;

function buildHeader(
  year: number,
  withGoals: YearQuarterInput[],
  empty: YearQuarterInput[],
  omitIncomplete: boolean
): string[] {
  const lines = [`# ${year} Goals Summary`, '', `**Year:** ${year}`];
  if (withGoals.length > 0) {
    lines.push(`**Quarters with goals:** ${withGoals.map(quarterLabel).join(', ')}`);
  }
  if (empty.length > 0) {
    lines.push(`**No goals:** ${empty.map(quarterLabel).join(', ')}`);
  }
  if (omitIncomplete) {
    lines.push('**Note:** Only completed goals are shown');
  }
  return lines;
}

function renderQuarterBodies(
  year: number,
  withGoals: YearQuarterInput[],
  options: QuarterlySummaryMarkdownOptions
): string {
  if (withGoals.length === 0) {
    return `*No goals found for ${year}.*`;
  }
  return withGoals
    .map((entry) => generateMultipleQuarterlyGoalsMarkdown(entry.summary, options))
    .join('\n\n');
}

/**
 * Generates a full-year markdown output from up to four quarter summaries.
 *
 * Emptiness is decided on the raw summary (before `omitIncomplete` filtering),
 * and `now` is resolved once and reused for every quarter footer.
 *
 * @param year - the calendar year being summarised
 * @param quarters - quarter summaries in any order; rendered ascending
 * @param options - options forwarded to each quarter generator
 * @returns markdown text with one section per quarter that has goals
 */
export function generateYearMarkdown(
  year: number,
  quarters: YearQuarterInput[],
  options: QuarterlySummaryMarkdownOptions = {}
): string {
  const now = options.now ?? Date.now();
  const sorted = [...quarters].sort((a, b) => a.quarter - b.quarter);
  const withGoals = sorted.filter((entry) => !isEmptyQuarter(entry.summary));
  const empty = sorted.filter((entry) => isEmptyQuarter(entry.summary));
  const quarterOptions = { ...options, now };
  const header = buildHeader(year, withGoals, empty, options.omitIncomplete === true);
  return [...header, '', '---', '', renderQuarterBodies(year, withGoals, quarterOptions)].join(
    '\n'
  );
}
