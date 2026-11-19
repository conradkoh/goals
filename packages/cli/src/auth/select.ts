import type { FlagSpec, ParsedArgs } from '../args.js';
import { parseFlags, stringFlag } from '../args.js';
import type { CredentialsFile, StoredCredential } from '../credentials.js';
import { readCredentials, selectCredential } from '../credentials.js';
import type { CommandContext } from '../deps.js';

/**
 * Parses a command's flags, reads the store and selects the target identity with the one
 * selection order every command shares (`--as`, GOALS_AS, the default, then the only account).
 */
export async function parseAndSelect(
  args: readonly string[],
  flags: FlagSpec,
  hint: string,
  ctx: CommandContext
): Promise<{ parsed: ParsedArgs; credential: StoredCredential; file: CredentialsFile }> {
  const parsed = parseFlags(args, flags, hint);
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  const credential = selectCredential(credentials, {
    as: stringFlag(parsed, 'as'),
    env: ctx.deps.env,
  });
  return { parsed, credential, file: credentials };
}
