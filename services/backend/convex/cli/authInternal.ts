import { v } from 'convex/values';

import { featureFlags } from '../../config/featureFlags';
import { findActiveCredential } from '../../modules/auth/cli-session';
import {
  CLI_CREDENTIAL_RETENTION_MS,
  CLI_CREDENTIAL_TTL_MS,
  CLI_HANDLE_PREFIX,
  CLI_MAX_ACTIVE_CREDENTIALS_PER_USER,
  CLI_MAX_PENDING_GLOBAL,
  CLI_MAX_PENDING_PER_INSTALLATION,
  CLI_REQUEST_RETENTION_MS,
  CLI_REQUEST_TTL_MS,
  CLI_TOUCH_INTERVAL_MS,
} from '../../modules/cli/constants';
import { constantTimeEqual, hashHandle } from '../../modules/cli/tokenCrypto';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { internalMutation, internalQuery } from '../_generated/server';
import type { CleanupResult } from '../cleanupTasks';

/**
 * Internal half of the CLI device-code login state machine.
 *
 * Security invariants enforced here:
 *   - The raw device code is never stored; only `deviceCodeHash`.
 *   - Unknown request ids and mismatched device codes are indistinguishable
 *     (`not_found`).
 *   - Polling a pending request performs no write at all.
 *   - The request → credential transition happens inside a single mutation.
 *   - No function returns the device code, hashes, handles or the user code
 *     except where the CLI must learn them (it learns none of them here).
 */

/** Outcome of creating a device-code login request. */
export type CreateRequestResult =
  { ok: true; expiresAt: number } | { ok: false; reason: 'login_disabled' | 'rate_limited' };

/** Outcome of polling a device-code login request. */
export type PollResult =
  | { status: 'not_found' | 'pending' | 'expired' | 'denied' | 'consumed' }
  | {
      status: 'approved';
      credentialId: Id<'cliCredentials'>;
      expiresAt: number;
      user: { userId: Id<'users'>; name: string; email?: string };
    };

/** Credential data the HTTP layer needs to resolve a CLI bearer handle. */
export type ResolvedHandle = {
  credentialId: Id<'cliCredentials'>;
  userId: Id<'users'>;
  expiresAt: number;
  lastUsedAt?: number;
  machineName: string;
  environment?: string;
  createdAt: number;
};

/**
 * Deletes up to `limit` request rows whose expiresAt is older than now - CLI_REQUEST_RETENTION_MS,
 * across all statuses. Returns the count.
 *
 * Bounded per status so a large backlog cannot time out the calling mutation.
 */
async function deleteExpiredRequests(
  ctx: MutationCtx,
  now: number,
  limit: number
): Promise<number> {
  const cutoff = now - CLI_REQUEST_RETENTION_MS;
  const statuses = ['pending', 'approved', 'denied', 'consumed'] as const;
  let deleted = 0;
  for (const status of statuses) {
    const remaining = limit - deleted;
    if (remaining <= 0) break;
    const rows = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_status_and_expiresAt', (q) => q.eq('status', status).lt('expiresAt', cutoff))
      .take(remaining);
    for (const row of rows) {
      await ctx.db.delete('cliAuthRequests', row._id);
      deleted++;
    }
  }
  return deleted;
}

/** Loads a request by its public id. */
async function findRequestByRequestId(
  ctx: MutationCtx,
  requestId: string
): Promise<Doc<'cliAuthRequests'> | null> {
  return ctx.db
    .query('cliAuthRequests')
    .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
    .first();
}

/**
 * Loads a request and confirms the caller knows its device code. A missing
 * row and a mismatched code both yield `null`, so callers cannot tell them
 * apart.
 */
async function findRequestForDevice(
  ctx: MutationCtx,
  requestId: string,
  deviceCodeHash: string
): Promise<Doc<'cliAuthRequests'> | null> {
  const row = await findRequestByRequestId(ctx, requestId);
  if (!row) return null;
  return constantTimeEqual(deviceCodeHash, row.deviceCodeHash) ? row : null;
}

/** The email a `full` user shares with the CLI; anonymous users have none. */
function userEmail(user: Doc<'users'>): string | undefined {
  return user.type === 'full' ? user.email : undefined;
}

/** True when the credential may still authenticate. */
function isActiveCredential(credential: Doc<'cliCredentials'>, now: number): boolean {
  return credential.revokedAt === undefined && credential.expiresAt > now;
}

/** Loads the newest credentials of a user, bounded for one mutation. */
async function listUserCredentials(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<Doc<'cliCredentials'>[]> {
  return ctx.db
    .query('cliCredentials')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .order('desc')
    .take(200);
}

/** True when a credential belongs to the same device slot as the request. */
function isSameDeviceSlot(
  credential: Doc<'cliCredentials'>,
  request: Doc<'cliAuthRequests'>
): boolean {
  // `undefined` environments compare equal: same installation without an
  // environment is the same slot.
  return (
    credential.installationId === request.installationId &&
    credential.environment === request.environment
  );
}

/** Revokes every active credential for the request's exact device slot. */
async function revokeReplacedCredentials(
  ctx: MutationCtx,
  userId: Id<'users'>,
  request: Doc<'cliAuthRequests'>,
  now: number
): Promise<void> {
  const credentials = await listUserCredentials(ctx, userId);
  for (const credential of credentials) {
    if (!isSameDeviceSlot(credential, request)) continue;
    if (!isActiveCredential(credential, now)) continue;
    await ctx.db.patch('cliCredentials', credential._id, {
      revokedAt: now,
      revokedReason: 'replaced',
    });
  }
}

/** Revokes the oldest active credentials until one slot is free for a new one. */
async function enforceCredentialLimit(
  ctx: MutationCtx,
  userId: Id<'users'>,
  now: number
): Promise<void> {
  const credentials = await listUserCredentials(ctx, userId);
  const active = credentials.filter((credential) => isActiveCredential(credential, now));
  active.sort((a, b) => a.createdAt - b.createdAt);
  while (active.length >= CLI_MAX_ACTIVE_CREDENTIALS_PER_USER) {
    const oldest = active.shift();
    if (!oldest) break;
    await ctx.db.patch('cliCredentials', oldest._id, {
      revokedAt: now,
      revokedReason: 'limit',
    });
  }
}

/**
 * Consumes an approved request and issues its credential.
 *
 * The request is only patched after the approver has been resolved, so a
 * missing user cannot leave a consumed request behind. Replacement and the
 * per-user cap are then applied before the new credential is inserted.
 */
async function consumeApprovedRequest(
  ctx: MutationCtx,
  request: Doc<'cliAuthRequests'>,
  candidateHandleHash: string,
  now: number
): Promise<PollResult> {
  if (request.expiresAt <= now) return { status: 'expired' };
  const userId = request.approvedByUserId;
  if (!userId) return { status: 'not_found' };
  const user = await ctx.db.get('users', userId);
  if (!user) return { status: 'not_found' };

  await ctx.db.patch('cliAuthRequests', request._id, {
    status: 'consumed',
    resolvedAt: now,
  });

  await revokeReplacedCredentials(ctx, userId, request, now);
  await enforceCredentialLimit(ctx, userId, now);

  const expiresAt = now + CLI_CREDENTIAL_TTL_MS;
  const credentialId = await ctx.db.insert('cliCredentials', {
    userId,
    handleHash: candidateHandleHash,
    installationId: request.installationId,
    machineName: request.machineName,
    environment: request.environment,
    createdAt: now,
    expiresAt,
  });

  return {
    status: 'approved',
    credentialId,
    expiresAt,
    user: {
      userId,
      name: user.name,
      email: userEmail(user),
    },
  };
}

/** Maps a terminal status to its poll outcome; `null` for pending/approved. */
function resolvedPollStatus(status: Doc<'cliAuthRequests'>['status']): PollResult | null {
  if (status === 'denied') return { status: 'denied' };
  if (status === 'consumed') return { status: 'consumed' };
  return null;
}

/** Maps a non-approved status to its poll outcome without writing. */
function pollNonApprovedStatus(request: Doc<'cliAuthRequests'>, now: number): PollResult | null {
  const resolved = resolvedPollStatus(request.status);
  if (resolved) return resolved;
  if (request.status === 'approved') return null;
  return request.expiresAt <= now ? { status: 'expired' } : { status: 'pending' };
}

/**
 * Creates a pending device-code login request and returns its expiry.
 *
 * Rate limits (global and per installation) are checked before any write;
 * the per-installation limit is scoped to unexpired pending rows only.
 */
export const createRequest = internalMutation({
  args: {
    requestId: v.string(),
    deviceCodeHash: v.string(),
    userCode: v.string(),
    installationId: v.string(),
    machineName: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CreateRequestResult> => {
    if (featureFlags.disableLogin) return { ok: false, reason: 'login_disabled' };

    const now = Date.now();

    // Lazy cleanup: keeps the pending-cap scans bounded without depending on cron.
    await deleteExpiredRequests(ctx, now, 50);

    const pendingGlobal = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_status_and_expiresAt', (q) => q.eq('status', 'pending').gt('expiresAt', now))
      .take(CLI_MAX_PENDING_GLOBAL + 1);
    if (pendingGlobal.length >= CLI_MAX_PENDING_GLOBAL) {
      return { ok: false, reason: 'rate_limited' };
    }

    const pendingForInstallation = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_installationId_and_status', (q) =>
        q.eq('installationId', args.installationId).eq('status', 'pending')
      )
      .take(50);
    const unexpiredForInstallation = pendingForInstallation.filter((row) => row.expiresAt > now);
    if (unexpiredForInstallation.length >= CLI_MAX_PENDING_PER_INSTALLATION) {
      return { ok: false, reason: 'rate_limited' };
    }

    const expiresAt = now + CLI_REQUEST_TTL_MS;
    await ctx.db.insert('cliAuthRequests', {
      requestId: args.requestId,
      deviceCodeHash: args.deviceCodeHash,
      userCode: args.userCode,
      installationId: args.installationId,
      machineName: args.machineName,
      environment: args.environment,
      status: 'pending',
      createdAt: now,
      expiresAt,
      codeAttempts: 0,
    });
    return { ok: true, expiresAt };
  },
});

/**
 * Polls a login request. On the first poll after approval this mutation also
 * consumes the request and issues the credential (atomic transition).
 */
export const pollOrConsume = internalMutation({
  args: {
    requestId: v.string(),
    deviceCodeHash: v.string(),
    candidateHandleHash: v.string(),
  },
  handler: async (ctx, args): Promise<PollResult> => {
    const now = Date.now();
    const request = await findRequestForDevice(ctx, args.requestId, args.deviceCodeHash);
    if (!request) return { status: 'not_found' };

    const status = pollNonApprovedStatus(request, now);
    if (status) return status;
    return consumeApprovedRequest(ctx, request, args.candidateHandleHash, now);
  },
});

/**
 * Resolves a CLI handle to its credential for the HTTP layer.
 * Returns `null` for non-CLI ids, unknown, revoked and expired credentials.
 */
export const resolveHandle = internalQuery({
  args: { handle: v.string() },
  handler: async (ctx, args): Promise<ResolvedHandle | null> => {
    if (!args.handle.startsWith(CLI_HANDLE_PREFIX)) return null;
    const row = await findActiveCredential(ctx, args.handle);
    if (!row) return null;
    return {
      credentialId: row._id,
      userId: row.userId,
      expiresAt: row.expiresAt,
      lastUsedAt: row.lastUsedAt,
      machineName: row.machineName,
      environment: row.environment,
      createdAt: row.createdAt,
    };
  },
});

/** True when `lastUsedAt` is old enough to be refreshed. */
function shouldTouchCredential(lastUsedAt: number | undefined, now: number): boolean {
  return lastUsedAt === undefined || now - lastUsedAt >= CLI_TOUCH_INTERVAL_MS;
}

/**
 * Records credential use, at most once per CLI_TOUCH_INTERVAL_MS.
 * Revoked credentials are left untouched.
 */
export const touchCredential = internalMutation({
  args: { credentialId: v.id('cliCredentials') },
  handler: async (ctx, args): Promise<null> => {
    const row = await ctx.db.get('cliCredentials', args.credentialId);
    if (!row) return null;
    if (row.revokedAt !== undefined) return null;
    const now = Date.now();
    if (!shouldTouchCredential(row.lastUsedAt, now)) return null;
    await ctx.db.patch('cliCredentials', args.credentialId, { lastUsedAt: now });
    return null;
  },
});

/**
 * Revokes the credential behind a handle (CLI logout). Idempotent: a missing
 * or already-revoked credential reports `revoked: false`.
 */
export const revokeByHandle = internalMutation({
  args: { handle: v.string() },
  handler: async (ctx, args): Promise<{ revoked: boolean }> => {
    const handleHash = await hashHandle(args.handle);
    const row = await ctx.db
      .query('cliCredentials')
      .withIndex('by_handleHash', (q) => q.eq('handleHash', handleHash))
      .first();
    if (!row || row.revokedAt !== undefined) return { revoked: false };
    await ctx.db.patch('cliCredentials', row._id, {
      revokedAt: Date.now(),
      revokedReason: 'logout',
    });
    return { revoked: true };
  },
});

/** True when a credential is revoked or expired past the retention window. */
function isStaleCredential(credential: Doc<'cliCredentials'>, cutoff: number): boolean {
  const revokedLongAgo = credential.revokedAt !== undefined && credential.revokedAt < cutoff;
  return revokedLongAgo || credential.expiresAt < cutoff;
}

/**
 * Deletes up to `limit` stale credentials from the oldest 200 rows.
 *
 * Bounded best-effort scan: there is deliberately no index on revokedAt, so
 * the table order is the only ordering available.
 */
async function deleteStaleCredentials(
  ctx: MutationCtx,
  now: number,
  limit: number
): Promise<number> {
  const cutoff = now - CLI_CREDENTIAL_RETENTION_MS;
  const credentials = await ctx.db.query('cliCredentials').order('asc').take(200);
  let deleted = 0;
  for (const credential of credentials) {
    if (deleted >= limit) break;
    if (!isStaleCredential(credential, cutoff)) continue;
    await ctx.db.delete('cliCredentials', credential._id);
    deleted++;
  }
  return deleted;
}

/** Bounded, best-effort retention sweep invoked by `cleanupTasks`. */
export const cleanupExpiredCliData = internalMutation({
  args: {},
  handler: async (ctx): Promise<CleanupResult> => {
    const now = Date.now();
    const deletedRequests = await deleteExpiredRequests(ctx, now, 100);
    const deletedCredentials = await deleteStaleCredentials(ctx, now, 100);
    return { success: true, deletedCount: deletedRequests + deletedCredentials };
  },
});
