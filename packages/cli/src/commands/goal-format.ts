import { formatKeyValues, formatTable } from '../output.js';
import type { CliGoalDetail, CliGoalRow } from '../vendor/cli-contract/index.js';
import { htmlToPlainText } from '../vendor/quarterly-markdown/index.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** `YYYY-MM-DD` in UTC; the wire contract stores instants, the CLI prints calendar dates. */
export function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** ` Q3`, ` W31`… or an empty string when the part is absent. */
function periodPart(value: number | undefined, prefix: string): string {
  return value === undefined ? '' : ` ${prefix}${value}`;
}

function dayPart(dayOfWeek: number | undefined): string {
  if (dayOfWeek === undefined) return '';
  return ` ${DAY_NAMES[dayOfWeek - 1] ?? ''}`;
}

/** e.g. `2026 Q3 W31 Wed` for a daily goal, `2026 W31` for an adhoc one. */
function periodOf(row: CliGoalRow): string {
  return `${row.year}${periodPart(row.quarter, 'Q')}${periodPart(row.week, 'W')}${dayPart(row.dayOfWeek)}`;
}

function statusText(row: CliGoalRow): string {
  if (!row.isComplete) return 'incomplete';
  return row.completedAt === undefined ? 'complete' : `complete (${isoDate(row.completedAt)})`;
}

function parentText(detail: CliGoalDetail): string | undefined {
  if (detail.parentId === undefined) return undefined;
  return detail.parentTitle === undefined
    ? detail.parentId
    : `${detail.parentTitle} (${detail.parentId})`;
}

function domainText(detail: CliGoalDetail): string | undefined {
  if (detail.domainId === undefined) return undefined;
  return detail.domainName === undefined
    ? detail.domainId
    : `${detail.domainName} (${detail.domainId})`;
}

type DetailRow = readonly [string, string];

/** Appends one row only when the value is present. */
function withRow(rows: DetailRow[], key: string, value: string | undefined): DetailRow[] {
  if (value !== undefined) rows.push([key, value]);
  return rows;
}

/** The `Key: value` block of `goal get`, with absent rows omitted. */
function detailRows(detail: CliGoalDetail): DetailRow[] {
  const rows: DetailRow[] = [
    ['ID', detail.id],
    ['Title', detail.title],
    ['Scope', detail.scope],
    ['Status', statusText(detail)],
    ['Period', periodOf(detail)],
  ];
  withRow(rows, 'Parent', parentText(detail));
  withRow(rows, 'Domain', domainText(detail));
  withRow(rows, 'Initiative', detail.initiativeId);
  withRow(rows, 'Due', detail.dueDate === undefined ? undefined : isoDate(detail.dueDate));
  return rows;
}

/** A blank line, a title, then the plain text of `html` indented two spaces; empty → no lines. */
export function plainTextBlock(title: string, html: string): string[] {
  const lines = htmlToPlainText(html)
    .split('\n')
    .filter((line) => line !== '');
  if (lines.length === 0) return [];
  return ['', title, ...lines.map((line) => `  ${line}`)];
}

function childLines(detail: CliGoalDetail): string[] {
  if (detail.children.length === 0) return [];
  return [
    '',
    'Children:',
    ...detail.children.map(
      (child) => `  ${child.isComplete ? '[x]' : '[ ]'} ${child.id}  ${child.title}`
    ),
  ];
}

/** The full `goal get` text: key/values, then plain-text details, then children. */
export function formatGoalDetail(detail: CliGoalDetail): string {
  const blocks = [
    formatKeyValues(detailRows(detail)).trimEnd(),
    ...plainTextBlock('Details:', detail.details ?? ''),
    ...childLines(detail),
  ];
  return `${blocks.join('\n')}\n`;
}

/** The `goal list` table: one row per goal, status marker first. */
export function formatGoalTable(rows: readonly CliGoalRow[]): string {
  return formatTable(
    ['ID', 'STATUS', 'PERIOD', 'TITLE'],
    rows.map((row) => [row.id, row.isComplete ? '[x]' : '[ ]', periodOf(row), row.title]),
    []
  );
}

/** stderr note when the server capped a list. */
export function truncationNote(noun: 'goals' | 'initiatives', shown: number): string {
  return `Showing the first ${shown} ${noun}; more exist. Use --limit to raise the cap (max 500).\n`;
}
