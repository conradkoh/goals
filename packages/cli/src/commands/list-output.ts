import type { ParsedArgs } from '../args.js';
import { booleanFlag } from '../args.js';
import type { CommandContext } from '../deps.js';
import { toJson } from '../output.js';
import type { CliList } from '../vendor/cli-contract/index.js';

/**
 * Writes a bounded list: a bare JSON array with `--json`, else the caller's text table or the
 * command's empty message. stdout carries only the list; truncation notes go to stderr.
 */
export function writeBoundedList<T>(
  ctx: CommandContext,
  parsed: ParsedArgs,
  result: CliList<T>,
  empty: string,
  format: (items: readonly T[]) => string
): void {
  if (booleanFlag(parsed, 'json')) {
    ctx.deps.stdout.write(toJson(result.items));
    return;
  }
  ctx.deps.stdout.write(result.items.length === 0 ? empty : format(result.items));
}
