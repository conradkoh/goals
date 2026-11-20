import { parseArgs } from 'node:util';

import { UsageError } from './errors.js';

export type FlagSpec = Record<string, { type: 'string' | 'boolean'; multiple?: boolean }>;

export interface ParsedArgs {
  flags: Record<string, string | boolean | string[] | undefined>;
  positionals: string[];
}

/** e.g. { min: 1, max: 1, name: '<label>' } */
export interface PositionalRule {
  min: number;
  max: number;
  name: string;
}

const NO_POSITIONALS: PositionalRule = { min: 0, max: 0, name: '' };

function usageSuffix(hint: string): string {
  return `Run \`${hint}\` for usage.`;
}

/** Node's parseArgs message is multi-sentence; the CLI keeps only the first sentence. */
function firstSentence(message: string): string {
  const head = message.split('. ')[0] ?? message;
  return head.endsWith('.') ? head.slice(0, -1) : head;
}

function isParseArgsError(error: unknown): boolean {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_');
}

/** `parseArgs` types values as possibly-array; without `multiple` only single values occur. */
function singleValue(
  value: string | boolean | (string | boolean)[] | undefined
): string | boolean | undefined {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

type RawValue = string | boolean | (string | boolean)[] | undefined;

function isMultipleFlag(spec: FlagSpec, name: string): boolean {
  return spec[name]?.multiple === true;
}

/** Every string value of a `multiple` flag, or `undefined` when it was not passed. */
function multipleValues(value: RawValue): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [String(value)];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * A `multiple` flag keeps every value as `string[]` (absent stays `undefined`); every other flag
 * keeps `parseArgs`'s last-wins behaviour.
 */
function normalizedValue(
  spec: FlagSpec,
  name: string,
  value: RawValue
): string | boolean | string[] | undefined {
  if (isMultipleFlag(spec, name)) return multipleValues(value);
  return singleValue(value);
}

function normalizeValues(
  values: Record<string, RawValue>,
  spec: FlagSpec
): Record<string, string | boolean | string[] | undefined> {
  const entries = Object.entries(values).map(
    ([key, value]) => [key, normalizedValue(spec, key, value)] as const
  );
  return Object.fromEntries(entries);
}

function toUsageError(error: unknown, hint: string): UsageError {
  if (isParseArgsError(error)) {
    const message = error instanceof Error ? error.message : String(error);
    return new UsageError(`${firstSentence(message)}. ${usageSuffix(hint)}`);
  }
  throw error;
}

function checkPositionals(positionals: string[], rule: PositionalRule, hint: string): void {
  if (positionals.length < rule.min) {
    throw new UsageError(`missing required argument ${rule.name}. ${usageSuffix(hint)}`);
  }
  const extra = positionals[rule.max];
  if (extra !== undefined) {
    throw new UsageError(`unexpected argument '${extra}'. ${usageSuffix(hint)}`);
  }
}

/**
 * Strict `parseArgs` wrapper: renders every parse failure as a `UsageError` ending with the
 * help hint, and enforces the positional count before the command sees anything.
 */
export function parseFlags(
  args: readonly string[],
  spec: FlagSpec,
  hint: string,
  positionals: PositionalRule = NO_POSITIONALS
): ParsedArgs {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({ args: [...args], options: spec, strict: true, allowPositionals: true });
  } catch (error) {
    throw toUsageError(error, hint);
  }
  const collected = [...parsed.positionals];
  checkPositionals(collected, positionals, hint);
  return { flags: normalizeValues(parsed.values, spec), positionals: collected };
}

/**
 * A usage error whose message ends with the command's help hint, e.g.
 * `Usage: --week is not supported for quarterly goals. Run \`goals goal list --help\` for usage.`
 */
export function usageFailure(message: string, hint: string): UsageError {
  return new UsageError(`${message}. ${usageSuffix(hint)}`);
}

/** The flag's string value, or `undefined` when absent (`--as ""` is returned as `''`). */
export function stringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags[name];
  return typeof value === 'string' ? value : undefined;
}

/** True only when the flag was passed. */
export function booleanFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags[name] === true;
}

/** Every value of a `multiple` flag, in the order given; `[]` when absent. */
export function listFlag(parsed: ParsedArgs, name: string): string[] {
  const value = parsed.flags[name];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
