import { randomUUID } from 'node:crypto';
import { open, rename, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { FlagSpec, ParsedArgs } from '../args.js';
import { booleanFlag, listFlag, parseFlags, stringFlag, usageFailure } from '../args.js';
import type { SelectedIdentity } from '../auth/select.js';
import { selectIdentity } from '../auth/select.js';
import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { CliError, safeMessage } from '../errors.js';
import { intFlag, omitUndefined, requiredInt } from './goal-flags.js';
import type { CliOpMap } from '../vendor/cli-contract/index.js';
import type {
  MarkdownQuarterSummary,
  QuarterlySummaryMarkdownOptions,
  YearQuarterInput,
} from '../vendor/quarterly-markdown/index.js';
import {
  generateMultipleQuarterlyGoalsMarkdown,
  generateYearMarkdown,
} from '../vendor/quarterly-markdown/index.js';

const HINT = 'goals export markdown --help';

const FLAGS: FlagSpec = {
  year: { type: 'string' },
  quarter: { type: 'string' },
  'completed-only': { type: 'boolean' },
  goal: { type: 'string', multiple: true },
  domain: { type: 'string', multiple: true },
  'no-adhoc': { type: 'boolean' },
  out: { type: 'string' },
  as: { type: 'string' },
};

type QuarterArgs = CliOpMap['export.quarterSummary']['args'];
type Quarter = QuarterArgs['quarter'];

/** Every quarter a year-only export requests, in the order the document renders them. */
const YEAR_QUARTERS: readonly Quarter[] = [1, 2, 3, 4];

/** Literal the dashboard uses to mean "adhoc goals with no domain". */
const UNCATEGORIZED = 'UNCATEGORIZED';

/** A fully validated request: every usage rule has passed and no I/O has run yet. */
interface ExportRequest {
  year: number;
  quarter?: Quarter;
  completedOnly: boolean;
  goalIds?: string[];
  adhocDomainIds?: string[];
  includeAdhoc: boolean;
  out?: string;
}

/** What the terminal needs from a finished export. */
interface ExportResult {
  markdown: string;
  /** The `No goals found …` stderr note, only for a quarter/all-year empty result. */
  emptyNote?: string;
}

function isQuarter(value: number | undefined): value is Quarter {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** `--quarter`, range-checked by `intFlag` and narrowed to 1-4 without a cast. */
function quarterFlag(parsed: ParsedArgs): Quarter | undefined {
  const value = intFlag(parsed, 'quarter', HINT);
  return isQuarter(value) ? value : undefined;
}

/**
 * Every value of a repeatable flag: trimmed, non-empty, de-duplicated in first-seen order.
 * Returns `undefined` when the flag was not passed at all.
 */
function repeatedValues(parsed: ParsedArgs, name: string): string[] | undefined {
  const values = listFlag(parsed, name).map((value) => value.trim());
  if (values.length === 0) return undefined;
  if (values.includes('')) throw usageFailure(`--${name} must not be empty`, HINT);
  return [...new Set(values)];
}

/** `--domain` values, with a case-insensitive `uncategorized` mapped to the wire literal. */
function domainValues(parsed: ParsedArgs): string[] | undefined {
  return repeatedValues(parsed, 'domain')?.map((value) =>
    value.toLowerCase() === 'uncategorized' ? UNCATEGORIZED : value
  );
}

/** `--out`, kept as the user wrote it; an explicitly empty value is a usage error. */
function outFlag(parsed: ParsedArgs): string | undefined {
  const value = stringFlag(parsed, 'out');
  if (value === undefined) return undefined;
  if (value.trim() === '') throw usageFailure('--out must not be empty', HINT);
  return value;
}

/** Rule 3: `--goal` ids are only meaningful for one quarter; a year-only export rejects them. */
function goalFilter(parsed: ParsedArgs, quarter: Quarter | undefined): string[] | undefined {
  const goalIds = repeatedValues(parsed, 'goal');
  if (goalIds === undefined) return undefined;
  if (quarter === undefined) {
    throw usageFailure('--goal requires --quarter (a goal belongs to exactly one quarter)', HINT);
  }
  return goalIds;
}

/** Rule 4: `--domain` filters the adhoc goals `--no-adhoc` removes, so the pair is rejected. */
function domainFilter(parsed: ParsedArgs, includeAdhoc: boolean): string[] | undefined {
  const adhocDomainIds = domainValues(parsed);
  if (adhocDomainIds === undefined) return undefined;
  if (!includeAdhoc) throw usageFailure('--domain cannot be combined with --no-adhoc', HINT);
  return adhocDomainIds;
}

/** Rules 1-5: everything about the flags is decided here, before any credential read. */
function parseExportRequest(parsed: ParsedArgs): ExportRequest {
  const year = requiredInt(parsed, 'year', 'for export', HINT);
  const quarter = quarterFlag(parsed);
  const includeAdhoc = !booleanFlag(parsed, 'no-adhoc');
  return {
    year,
    quarter,
    completedOnly: booleanFlag(parsed, 'completed-only'),
    goalIds: goalFilter(parsed, quarter),
    adhocDomainIds: domainFilter(parsed, includeAdhoc),
    includeAdhoc,
    out: outFlag(parsed),
  };
}

/** The wire request for one quarter; absent filters never reach the body. */
function quarterArgs(request: ExportRequest, quarter: Quarter): QuarterArgs {
  return omitUndefined<QuarterArgs>({
    year: request.year,
    quarter,
    goalIds: request.goalIds,
    includeAdhoc: request.includeAdhoc,
    adhocDomainIds: request.adhocDomainIds,
  });
}

/** A summary is empty on its raw goal lists, before `--completed-only` filtering. */
function isEmpty(summary: MarkdownQuarterSummary): boolean {
  return summary.quarterlyGoals.length === 0 && (summary.adhocGoals?.length ?? 0) === 0;
}

async function fetchQuarter(
  ctx: CommandContext,
  identity: SelectedIdentity,
  request: ExportRequest,
  quarter: Quarter
): Promise<MarkdownQuarterSummary> {
  const result = await ctx.api.call(
    identity.credential,
    'export.quarterSummary',
    quarterArgs(request, quarter)
  );
  return result.summary;
}

function renderOptions(request: ExportRequest, now: number): QuarterlySummaryMarkdownOptions {
  return { omitIncomplete: request.completedOnly, now };
}

/** One quarter's document; an empty summary still prints the document plus a stderr note. */
async function exportQuarter(
  ctx: CommandContext,
  identity: SelectedIdentity,
  request: ExportRequest,
  quarter: Quarter,
  now: number
): Promise<ExportResult> {
  const summary = await fetchQuarter(ctx, identity, request, quarter);
  return {
    markdown: generateMultipleQuarterlyGoalsMarkdown(summary, renderOptions(request, now)),
    ...(isEmpty(summary) ? { emptyNote: `No goals found for Q${quarter} ${request.year}\n` } : {}),
  };
}

/** Every quarter in ascending order, then the year document over the same single `now`. */
async function exportYear(
  ctx: CommandContext,
  identity: SelectedIdentity,
  request: ExportRequest,
  now: number
): Promise<ExportResult> {
  const quarters: YearQuarterInput[] = [];
  for (const quarter of YEAR_QUARTERS) {
    quarters.push({ quarter, summary: await fetchQuarter(ctx, identity, request, quarter) });
  }
  const allEmpty = quarters.every(({ summary }) => isEmpty(summary));
  return {
    markdown: generateYearMarkdown(request.year, quarters, renderOptions(request, now)),
    ...(allEmpty ? { emptyNote: `No goals found for ${request.year}\n` } : {}),
  };
}

/** True when the value is a Node filesystem error carrying an errno `code`. */
function isErrnoError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
  );
}

function writeFailureReason(error: unknown): string {
  if (isErrnoError(error)) return error.code;
  return safeMessage(error instanceof Error ? error.message : undefined, 'unknown error');
}

/**
 * Writes `text` beside `path` and renames it into place, so a failure never leaves a partial
 * file: the destination keeps its old content until the rename succeeds. Parent directories
 * are never created.
 */
async function writeFileAtomically(path: string, text: string): Promise<void> {
  const tmp = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let created = false;
  try {
    const handle = await open(tmp, 'wx');
    created = true;
    try {
      await handle.writeFile(text);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, path);
  } catch (error) {
    if (created) await unlink(tmp).catch(() => {});
    throw new CliError(`Could not write ${path}: ${writeFailureReason(error)}`);
  }
}

/** Markdown to stdout by default, or the file with `--out`; diagnostics always to stderr. */
async function emitExport(
  ctx: CommandContext,
  request: ExportRequest,
  result: ExportResult
): Promise<void> {
  if (request.out === undefined) {
    ctx.deps.stdout.write(result.markdown);
  } else {
    await writeFileAtomically(request.out, result.markdown);
    ctx.deps.stderr.write(`Wrote ${request.out}\n`);
  }
  if (result.emptyNote !== undefined) ctx.deps.stderr.write(result.emptyNote);
}

/** `goals export markdown` — the webapp's quarterly summary markdown, for one quarter or a year. */
async function runExportMarkdown(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, FLAGS, HINT);
  const request = parseExportRequest(parsed);
  const identity = await selectIdentity(parsed, ctx);
  const now = ctx.deps.now();
  const result =
    request.quarter === undefined
      ? await exportYear(ctx, identity, request, now)
      : await exportQuarter(ctx, identity, request, request.quarter, now);
  await emitExport(ctx, request, result);
}

const ACTIONS = { markdown: runExportMarkdown };

export async function runExportCommand(
  args: readonly string[],
  ctx: CommandContext
): Promise<void> {
  await runFamilyAction('export', ACTIONS, args, ctx);
}
