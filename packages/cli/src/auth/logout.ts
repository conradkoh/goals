import type { FlagSpec } from '../args.js';
import { readCredentials, removeCredential, writeCredentials } from '../credentials.js';
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
  const { credential } = await parseAndSelect(args, FLAGS, HINT, ctx);

  try {
    await ctx.api.revoke(credential);
  } catch (error) {
    ctx.deps.stderr.write(warningText(error));
  }

  // Re-read: another login/logout may have changed the file while the revoke was in flight.
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  const current = credentials.accounts.find((account) => account.label === credential.label);
  if (current?.credentialId === credential.credentialId) {
    await writeCredentials(removeCredential(credentials, credential.label), ctx.deps.storeOptions);
  }
  ctx.deps.stdout.write(`Logged out of '${credential.label}'.\n`);
}
