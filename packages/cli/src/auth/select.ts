import type { FlagSpec, ParsedArgs } from '../args.js';
import { parseFlags, stringFlag } from '../args.js';
import type { CredentialsFile, StoredCredential } from '../credentials.js';
import { readCredentials, selectCredential } from '../credentials.js';
import type { CommandContext } from '../deps.js';
import type { CliOpMap, CliOpName } from '../vendor/cli-contract/index.js';

export interface SelectedIdentity {
  credential: StoredCredential;
  file: CredentialsFile;
}

/**
 * Reads the store and selects the target identity with the one selection order every command
 * shares (`--as`, GOALS_AS, the default, then the only account).
 *
 * Call this only after every flag has been parsed and validated, so usage errors never touch
 * the credentials file.
 */
async function selectIdentity(parsed: ParsedArgs, ctx: CommandContext): Promise<SelectedIdentity> {
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  const credential = selectCredential(credentials, {
    as: stringFlag(parsed, 'as'),
    env: ctx.deps.env,
  });
  return { credential, file: credentials };
}

/** Parses a command's flags, then selects the identity; the shape every auth command uses. */
export async function parseAndSelect(
  args: readonly string[],
  flags: FlagSpec,
  hint: string,
  ctx: CommandContext
): Promise<{ parsed: ParsedArgs } & SelectedIdentity> {
  const parsed = parseFlags(args, flags, hint);
  return { parsed, ...(await selectIdentity(parsed, ctx)) };
}

/**
 * Selects the identity and runs one gateway op with it. Every command calls this only after
 * all flags are validated, so a usage error never reads the store or sends a request.
 */
export async function callAsIdentity<K extends CliOpName>(
  ctx: CommandContext,
  parsed: ParsedArgs,
  op: K,
  args: CliOpMap[K]['args']
): Promise<CliOpMap[K]['result']> {
  const { credential } = await selectIdentity(parsed, ctx);
  return await ctx.api.call(credential, op, args);
}
