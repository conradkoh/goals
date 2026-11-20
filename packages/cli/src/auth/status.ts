import type { FlagSpec } from '../args.js';
import { booleanFlag } from '../args.js';
import type { CommandContext } from '../deps.js';
import { formatKeyValues, toJson } from '../output.js';
import { parseAndSelect } from './select.js';

const HINT = 'goals auth status --help';
const FLAGS: FlagSpec = {
  as: { type: 'string' },
  json: { type: 'boolean' },
};

/** The stored origins are validated at login, so URL parsing cannot fail here. */
function hostOf(convexUrl: string): string {
  return new URL(convexUrl).host;
}

export async function runStatus(args: readonly string[], ctx: CommandContext): Promise<void> {
  const { parsed, credential } = await parseAndSelect(args, FLAGS, HINT, ctx);
  const whoami = await ctx.api.call(credential, 'auth.whoami', {});
  const environment = credential.environment ?? null;
  const convexHost = hostOf(credential.convexUrl);
  const createdAt = new Date(whoami.createdAt).toISOString();
  const expiresAt = new Date(whoami.expiresAt).toISOString();

  if (booleanFlag(parsed, 'json')) {
    ctx.deps.stdout.write(
      toJson({
        name: whoami.name,
        userId: whoami.userId,
        label: credential.label,
        environment,
        convexHost,
        createdAt,
        expiresAt,
        valid: true,
      })
    );
    return;
  }

  ctx.deps.stdout.write(
    formatKeyValues([
      ['Name', whoami.name],
      ['User ID', whoami.userId],
      ['Identity', credential.label],
      ['Environment', environment ?? 'default'],
      ['Server', convexHost],
      ['Created', createdAt],
      ['Expires', expiresAt],
      ['Valid', 'yes'],
    ])
  );
}
