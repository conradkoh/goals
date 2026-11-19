import type { FlagSpec } from '../args.js';
import { parseFlags, stringFlag } from '../args.js';
import type { CredentialsFile, StoredCredential } from '../credentials.js';
import {
  identityKey,
  LABEL_PATTERN,
  normalizeEnvironment,
  readCredentials,
  upsertCredential,
  writeCredentials,
} from '../credentials.js';
import type { CliDeps, CommandContext } from '../deps.js';
import type { Endpoints } from '../endpoints.js';
import { resolveEndpoints } from '../endpoints.js';
import { CliError, UsageError } from '../errors.js';
import type { ApiClient } from '../http.js';

const HINT = 'goals auth login --help';
const FLAGS: FlagSpec = {
  name: { type: 'string' },
  env: { type: 'string' },
  'webapp-url': { type: 'string' },
  'convex-url': { type: 'string' },
};

const MACHINE_NAME_FALLBACK = 'Goals computer';
const MACHINE_NAME_MAX = 64;
const MIN_INTERVAL_MS = 100;
const MAX_INTERVAL_MS = 60000;

const CANCELED = 'Login cancelled';
const EXPIRED = 'Login expired; run the command again.';
const POLL_FAILURES: Record<PollFailure, string> = {
  denied: 'Login denied; run the command again.',
  expired: EXPIRED,
  consumed: 'Login request was already used; run the command again.',
  not_found: 'Login request not found; run the command again.',
};

type LoginRequest = Awaited<ReturnType<ApiClient['createLoginRequest']>>;
type ExchangeResult = Awaited<ReturnType<ApiClient['exchangeLoginRequest']>>;
type ApprovedLogin = Extract<ExchangeResult, { status: 'approved' }>;
type PollFailure = Exclude<ExchangeResult['status'], 'approved' | 'pending'>;

interface LoginOptions {
  requestedName: string | undefined;
  environment: string | undefined;
  endpoints: Endpoints;
}

/** Validates every flag before any file or network access. */
function parseLoginArgs(args: readonly string[]): LoginOptions {
  const parsed = parseFlags(args, FLAGS, HINT);
  const endpoints = resolveEndpoints({
    webappUrl: stringFlag(parsed, 'webapp-url'),
    convexUrl: stringFlag(parsed, 'convex-url'),
  });
  const environment = normalizeEnvironment(stringFlag(parsed, 'env'));
  const requestedName = stringFlag(parsed, 'name');
  if (requestedName !== undefined && !LABEL_PATTERN.test(requestedName)) {
    throw new UsageError('--name must be 1-64 characters of A-Z, a-z, 0-9, ".", "_" or "-"');
  }
  return { requestedName, environment, endpoints };
}

function machineName(deps: CliDeps): string {
  let raw: string;
  try {
    raw = deps.hostname();
  } catch {
    return MACHINE_NAME_FALLBACK;
  }
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MACHINE_NAME_MAX);
  return cleaned === '' ? MACHINE_NAME_FALLBACK : cleaned;
}

function loginBody(
  credentials: CredentialsFile,
  environment: string | undefined,
  deps: CliDeps
): { installationId: string; machineName: string; environment?: string } {
  return {
    installationId: credentials.installationId,
    machineName: machineName(deps),
    ...(environment === undefined ? {} : { environment }),
  };
}

function verificationUrl(endpoints: Endpoints, requestId: string): string {
  const url = new URL('/cli/authorize', endpoints.webappUrl);
  url.searchParams.set('request', requestId);
  return url.toString();
}

/** Progress goes to stderr so stdout stays data-only; the code is typed by a human. */
function announce(deps: CliDeps, url: string, userCode: string): void {
  deps.stderr.write(
    `Open ${url}\nVerification code: ${userCode}\nWaiting for approval... Press Ctrl+C to cancel.\n`
  );
}

/** A browser that cannot start (headless server, no xdg-open) must never fail the login. */
function openBrowserQuietly(deps: CliDeps, url: string): void {
  try {
    void deps.openBrowser(url).catch(() => undefined);
  } catch {
    // Best effort only.
  }
}

function clampInterval(ms: number): number {
  return Math.min(Math.max(ms, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
}

async function exchange(
  api: ApiClient,
  convexUrl: string,
  request: LoginRequest,
  signal: AbortSignal
): Promise<ExchangeResult> {
  try {
    return await api.exchangeLoginRequest(
      { convexUrl },
      { requestId: request.requestId, deviceCode: request.deviceCode },
      signal
    );
  } catch (error) {
    if (signal.aborted) throw new CliError(CANCELED);
    throw error;
  }
}

/** Throws before every poll when the user cancelled or the request has expired. */
function assertStillWaiting(deps: CliDeps, request: LoginRequest, signal: AbortSignal): void {
  if (signal.aborted) throw new CliError(CANCELED);
  if (deps.now() >= request.expiresAt) throw new CliError(EXPIRED);
}

async function pollUntilApproved(
  api: ApiClient,
  deps: CliDeps,
  endpoints: Endpoints,
  request: LoginRequest,
  controller: AbortController
): Promise<ApprovedLogin> {
  for (;;) {
    assertStillWaiting(deps, request, controller.signal);
    const result = await exchange(api, endpoints.convexUrl, request, controller.signal);
    if (result.status === 'approved') return result;
    if (result.status === 'pending') {
      await deps.sleep(clampInterval(result.intervalMs), controller.signal);
      continue;
    }
    throw new CliError(POLL_FAILURES[result.status]);
  }
}

/** The identity label a fresh credential gets, before collisions are checked. */
function draftLabel(environment: string | undefined): string {
  return environment ?? 'default';
}

function credentialDraft(
  options: LoginOptions,
  approved: ApprovedLogin,
  issuedAt: number
): StoredCredential {
  const { account } = approved;
  return {
    label: draftLabel(options.environment),
    userId: account.userId,
    name: account.name,
    ...(account.email === undefined ? {} : { email: account.email }),
    ...(options.environment === undefined ? {} : { environment: options.environment }),
    webappUrl: options.endpoints.webappUrl,
    convexUrl: options.endpoints.convexUrl,
    credentialId: approved.tokenId,
    token: approved.token,
    createdAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(approved.expiresAt).toISOString(),
  };
}

function accountsInSlot(
  accounts: StoredCredential[],
  convexUrl: string,
  environment: string | undefined
): StoredCredential[] {
  return accounts.filter(
    (account) => account.convexUrl === convexUrl && account.environment === environment
  );
}

function takenLabelMessage(label: string): string {
  return `identity label '${label}' is already used by another account; pass --name ${label} to choose a different one`;
}

/** The label that will certainly be used, when it can be known before approval. */
function certainLabel(
  requestedName: string | undefined,
  environment: string | undefined,
  slot: StoredCredential[]
): string | undefined {
  if (requestedName !== undefined) return requestedName;
  return slot.length === 0 ? draftLabel(environment) : undefined;
}

function ensureLabelAvailable(
  accounts: StoredCredential[],
  label: string,
  slot: StoredCredential[]
): void {
  const taken = accounts.some((account) => account.label === label && !slot.includes(account));
  if (taken) throw new UsageError(takenLabelMessage(label));
}

/** `--name`, else the label this identity already has, else the environment, else "default". */
function finalLabel(
  credentials: CredentialsFile,
  draft: StoredCredential,
  requestedName: string | undefined
): string {
  if (requestedName !== undefined) return requestedName;
  const key = identityKey(draft);
  const existing = credentials.accounts.find((account) => identityKey(account) === key);
  return existing?.label ?? draft.label;
}

/**
 * Re-reads the credential file right before writing so a login/logout that finished while this
 * one waited for browser approval is never overwritten. A rejected write (or a label that was
 * taken in the meantime) revokes the fresh server token so nothing is orphaned.
 */
async function persist(
  ctx: CommandContext,
  options: LoginOptions,
  draft: StoredCredential,
  installationId: string
): Promise<StoredCredential> {
  try {
    const { credentials } = await readCredentials(ctx.deps.storeOptions);
    // The re-read makes a new installationId when the file is still missing; keep the one the
    // create request already sent so this machine is identified consistently by the server.
    const file =
      credentials.accounts.length === 0 ? { ...credentials, installationId } : credentials;
    const label = finalLabel(file, draft, options.requestedName);
    const slot = accountsInSlot(file.accounts, draft.convexUrl, draft.environment);
    ensureLabelAvailable(file.accounts, label, slot);
    const stored = { ...draft, label };
    await writeCredentials(upsertCredential(file, stored), ctx.deps.storeOptions);
    return stored;
  } catch (error) {
    await ctx.api.revoke(draft).catch(() => undefined);
    throw error;
  }
}

export async function runLogin(args: readonly string[], ctx: CommandContext): Promise<void> {
  const options = parseLoginArgs(args);
  const { credentials } = await readCredentials(ctx.deps.storeOptions);
  const slot = accountsInSlot(
    credentials.accounts,
    options.endpoints.convexUrl,
    options.environment
  );
  const earlyLabel = certainLabel(options.requestedName, options.environment, slot);
  if (earlyLabel !== undefined) ensureLabelAvailable(credentials.accounts, earlyLabel, slot);

  const controller = new AbortController();
  const request = await ctx.api.createLoginRequest(
    { convexUrl: options.endpoints.convexUrl },
    loginBody(credentials, options.environment, ctx.deps),
    controller.signal
  );
  const url = verificationUrl(options.endpoints, request.requestId);
  announce(ctx.deps, url, request.userCode);
  openBrowserQuietly(ctx.deps, url);

  const unregister = ctx.deps.onSigint(() => controller.abort());
  let approved: ApprovedLogin;
  try {
    approved = await pollUntilApproved(ctx.api, ctx.deps, options.endpoints, request, controller);
  } finally {
    unregister();
  }

  const stored = await persist(
    ctx,
    options,
    credentialDraft(options, approved, ctx.deps.now()),
    credentials.installationId
  );
  ctx.deps.stdout.write(
    `Logged in as ${stored.name} (identity '${stored.label}', environment ${stored.environment ?? 'default'}).\n`
  );
}
