import { parseFlags } from '../args.js';
import { readCredentials, setDefaultLabel, writeCredentials } from '../credentials.js';
import type { CommandContext } from '../deps.js';

const HINT = 'goals auth use --help';

export async function runUse(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, {}, HINT, { min: 1, max: 1, name: '<label>' });
  const label = parsed.positionals[0] ?? '';
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  await writeCredentials(setDefaultLabel(credentials, label), ctx.deps.storeOptions);
  ctx.deps.stdout.write(`Default identity is now '${label}'.\n`);
}
