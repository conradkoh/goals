import type { FlagSpec } from '../args.js';
import { removeCredential, writeCredentials } from '../credentials.js';
import type { CommandContext } from '../deps.js';
import { safeMessage } from '../errors.js';
import { parseAndSelect } from './select.js';

const HINT = 'goals auth logout --help';
const FLAGS: FlagSpec = { as: { type: 'string' } };

function warningText(error: unknown): string {
  const detail = safeMessage(error instanceof Error ? error.message : error, 'unexpected error');
  return `Warning: could not revoke the credential on the server (${detail}); it was removed from this machine only.\n`;
}

export async function runLogout(args: readonly string[], ctx: CommandContext): Promise<void> {
  const { credential, file } = await parseAndSelect(args, FLAGS, HINT, ctx);

  try {
    await ctx.api.revoke(credential);
  } catch (error) {
    ctx.deps.stderr.write(warningText(error));
  }

  await writeCredentials(removeCredential(file, credential.label), ctx.deps.storeOptions);
  ctx.deps.stdout.write(`Logged out of '${credential.label}'.\n`);
}
