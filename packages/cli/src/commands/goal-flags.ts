import type { ParsedArgs } from '../args.js';
import { stringFlag, usageFailure } from '../args.js';
import type { CliScope } from '../vendor/cli-contract/index.js';

/** The four goal families, in the order the CLI documents them. */
const SCOPES: readonly CliScope[] = ['quarterly', 'weekly', 'daily', 'adhoc'];

const SCOPES_TEXT = SCOPES.join(', ');
/** Integer flags and their inclusive range; mirrors the gateway's zod limits. */
const INTEGER_RANGES = {
  year: { min: 2000, max: 2100 },
  quarter: { min: 1, max: 4 },
  week: { min: 1, max: 53 },
  limit: { min: 1, max: 500 },
} as const;

type IntegerFlag = keyof typeof INTEGER_RANGES;
type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Every accepted `--day` spelling; Monday is 1 and Sunday is 7 (the backend's `DayOfWeek`). */
const DAY_ALIASES: Record<string, DayOfWeek> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

function integerText(name: IntegerFlag): string {
  const { min, max } = INTEGER_RANGES[name];
  return `--${name} must be an integer from ${min} to ${max}`;
}

/** The number `raw` names, or `undefined` when it is not an integer inside the flag's range. */
function inRange(name: IntegerFlag, raw: string): number | undefined {
  const { min, max } = INTEGER_RANGES[name];
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= min && value <= max ? value : undefined;
}

/** A numeric flag, or `undefined` when absent; its range is checked here, not by the server. */
export function intFlag(parsed: ParsedArgs, name: IntegerFlag, hint: string): number | undefined {
  const raw = stringFlag(parsed, name);
  if (raw === undefined) return undefined;
  const value = inRange(name, raw);
  if (value === undefined) throw usageFailure(integerText(name), hint);
  return value;
}

/** The required numeric flag, with the scope-specific `is required for …` message. */
export function requiredInt(
  parsed: ParsedArgs,
  name: IntegerFlag,
  subject: string,
  hint: string
): number {
  const value = intFlag(parsed, name, hint);
  if (value === undefined) throw usageFailure(`--${name} is required ${subject}`, hint);
  return value;
}

/** `--scope`, defaulted when the command has one; unknown values are a usage error. */
export function scopeFlag(parsed: ParsedArgs, hint: string, fallback?: CliScope): CliScope {
  const raw = stringFlag(parsed, 'scope');
  if (raw === undefined) {
    if (fallback !== undefined) return fallback;
    throw usageFailure('--scope is required', hint);
  }
  const scope = SCOPES.find((candidate) => candidate === raw);
  if (scope === undefined) throw usageFailure(`--scope must be one of ${SCOPES_TEXT}`, hint);
  return scope;
}

/** `--day` as 1-7 (Monday first), accepting `mon`/`monday`… and rejecting everything else. */
export function dayFlag(parsed: ParsedArgs, hint: string): DayOfWeek | undefined {
  const raw = stringFlag(parsed, 'day');
  if (raw === undefined) return undefined;
  const day = DAY_ALIASES[raw.trim().toLowerCase()];
  if (day === undefined) throw usageFailure('--day must be 1-7 or mon..sun', hint);
  return day;
}

/** A required text flag, trimmed; empty is a usage error, never an empty request value. */
export function requiredText(parsed: ParsedArgs, name: string, hint: string): string {
  const raw = stringFlag(parsed, name);
  if (raw === undefined) throw usageFailure(`--${name} is required`, hint);
  const value = raw.trim();
  if (value === '') throw usageFailure(`--${name} must not be empty`, hint);
  return value;
}

/** An optional text flag; an explicitly empty value is a usage error. */
export function optionalText(parsed: ParsedArgs, name: string, hint: string): string | undefined {
  const raw = stringFlag(parsed, name);
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (value === '') throw usageFailure(`--${name} must not be empty`, hint);
  return value;
}

/** Drops keys whose value is `undefined`, so request bodies never carry absent flags. */
export function omitUndefined<T extends object>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}
