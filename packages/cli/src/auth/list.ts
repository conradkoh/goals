import type { FlagSpec } from '../args.js';
import { booleanFlag, parseFlags } from '../args.js';
import type { StoredCredential } from '../credentials.js';
import { effectiveDefaultLabel, readCredentials } from '../credentials.js';
import type { CommandContext } from '../deps.js';
import { formatTable, toJson } from '../output.js';

const HINT = 'goals auth list --help';
const FLAGS: FlagSpec = { json: { type: 'boolean' } };
const HEADERS = ['LABEL', 'NAME', 'ENVIRONMENT', 'SERVER'] as const;
const EMPTY = 'No identities stored. Run `goals auth login`.\n';

function hostOf(convexUrl: string): string {
  return new URL(convexUrl).host;
}

function tableRow(account: StoredCredential): string[] {
  return [account.label, account.name, account.environment ?? 'default', hostOf(account.convexUrl)];
}

function jsonRow(account: StoredCredential, defaultLabel: string | undefined): object {
  return {
    label: account.label,
    name: account.name,
    userId: account.userId,
    environment: account.environment ?? null,
    convexHost: hostOf(account.convexUrl),
    isDefault: account.label === defaultLabel,
    createdAt: account.createdAt,
    expiresAt: account.expiresAt,
  };
}

export async function runList(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, FLAGS, HINT);
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  const json = booleanFlag(parsed, 'json');

  if (credentials.accounts.length === 0) {
    ctx.deps.stdout.write(json ? toJson([]) : EMPTY);
    return;
  }

  const defaultLabel = effectiveDefaultLabel(credentials);
  if (json) {
    ctx.deps.stdout.write(
      toJson(credentials.accounts.map((account) => jsonRow(account, defaultLabel)))
    );
    return;
  }
  const markers = credentials.accounts.map((account) =>
    account.label === defaultLabel ? '* ' : '  '
  );
  ctx.deps.stdout.write(formatTable(HEADERS, credentials.accounts.map(tableRow), markers));
}
