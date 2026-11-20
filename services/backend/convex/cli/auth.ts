import { v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { featureFlags } from '../../config/featureFlags';
import { requireAuthUserId } from '../../modules/auth/session';
import { CLI_MAX_CODE_ATTEMPTS } from '../../modules/cli/constants';
import { constantTimeEqual } from '../../modules/cli/tokenCrypto';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { mutation, query } from '../_generated/server';

/**
 * Browser-facing half of the CLI device-code login flow.
 *
 * These functions authenticate with the DEFAULT session resolver only (the
 * `sessions` table). A CLI credential handle therefore can never approve a
 * request, list credentials or revoke one — `cli_` ids are rejected here even
 * though `requireLogin` accepts them elsewhere.
 *
 * Nothing in this module returns the user code, device-code hash, handle,
 * handle hash or installation id to the browser.
 */

/** Status shown to the browser before a request has been polled to completion. */
export type AuthorizationRequestStatus =
  'pending' | 'approved' | 'denied' | 'expired' | 'consumed' | 'not_found';

/** Browser-safe view of a login request. */
export type AuthorizationRequestView = {
  status: AuthorizationRequestStatus;
  machineName?: string;
  environment?: string;
  createdAt?: number;
  expiresAt?: number;
};

/** Result of approving a login request. */
export type ApproveResult =
  | { success: true }
  | {
      success: false;
      reason:
        | 'not_found'
        | 'expired'
        | 'already_resolved'
        | 'code_mismatch'
        | 'too_many_attempts'
        | 'login_disabled';
    };

/** Result of denying a login request. */
export type DenyResult =
  { success: true } | { success: false; reason: 'not_found' | 'expired' | 'already_resolved' };

/** Browser-safe view of a CLI credential. */
export type CliCredentialView = {
  id: Id<'cliCredentials'>;
  machineName: string;
  environment?: string;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt: number;
  expired: boolean;
};

/** Result of revoking one of the caller's CLI credentials. */
export type RevokeResult = { success: true } | { success: false; reason: 'not_found' };

/**
 * Maps a stored status to the status the browser should see: `pending` and
 * `approved` requests past their expiry are reported as `expired`.
 */
function effectiveStatus(
  row: Doc<'cliAuthRequests'>,
  now: number
): Exclude<AuthorizationRequestStatus, 'not_found'> {
  if ((row.status === 'pending' || row.status === 'approved') && row.expiresAt <= now) {
    return 'expired';
  }
  return row.status;
}

/** Reads a login request by id for the approval screen. */
export const getAuthorizationRequest = query({
  args: {
    ...SessionIdArg,
    requestId: v.string(),
  },
  handler: async (ctx, args): Promise<AuthorizationRequestView> => {
    await requireAuthUserId(ctx, args);
    const row = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_requestId', (q) => q.eq('requestId', args.requestId))
      .first();
    if (!row) return { status: 'not_found' };
    return {
      status: effectiveStatus(row, Date.now()),
      machineName: row.machineName,
      environment: row.environment,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  },
});

/** True when this user already approved the request. */
function isAlreadyApproved(row: Doc<'cliAuthRequests'>, userId: Id<'users'>): boolean {
  return row.status === 'approved' && row.approvedByUserId === userId;
}

/**
 * Rejects a request the caller may not type a code into, or confirms an
 * idempotent re-approval. Returns `null` when the request is still pending.
 */
function checkApprovable(
  row: Doc<'cliAuthRequests'>,
  userId: Id<'users'>,
  now: number
): ApproveResult | null {
  if (effectiveStatus(row, now) === 'expired') {
    return { success: false, reason: 'expired' };
  }
  if (isAlreadyApproved(row, userId)) return { success: true };
  if (row.status === 'pending') return null;
  return { success: false, reason: 'already_resolved' };
}

/**
 * Compares the typed code with the stored one, counting a mismatch as an
 * attempt. The final mismatch denies the request. Failures are returned
 * rather than thrown so the attempt patch always commits.
 */
async function applyTypedCode(
  ctx: MutationCtx,
  row: Doc<'cliAuthRequests'>,
  userId: Id<'users'>,
  userCode: string,
  now: number
): Promise<ApproveResult> {
  const typed = userCode.replace(/\s/g, '');
  if (constantTimeEqual(typed, row.userCode)) {
    await ctx.db.patch('cliAuthRequests', row._id, {
      status: 'approved',
      approvedByUserId: userId,
    });
    return { success: true };
  }

  const attempts = row.codeAttempts + 1;
  if (attempts >= CLI_MAX_CODE_ATTEMPTS) {
    await ctx.db.patch('cliAuthRequests', row._id, {
      codeAttempts: attempts,
      status: 'denied',
      resolvedAt: now,
    });
    return { success: false, reason: 'too_many_attempts' };
  }
  await ctx.db.patch('cliAuthRequests', row._id, { codeAttempts: attempts });
  return { success: false, reason: 'code_mismatch' };
}

/**
 * Approves a pending request after the user types the code shown by the CLI.
 */
export const approveAuthorizationRequest = mutation({
  args: {
    ...SessionIdArg,
    requestId: v.string(),
    userCode: v.string(),
  },
  handler: async (ctx, args): Promise<ApproveResult> => {
    const userId = await requireAuthUserId(ctx, args);
    if (featureFlags.disableLogin) return { success: false, reason: 'login_disabled' };

    const row = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_requestId', (q) => q.eq('requestId', args.requestId))
      .first();
    if (!row) return { success: false, reason: 'not_found' };

    const now = Date.now();
    const rejection = checkApprovable(row, userId, now);
    if (rejection) return rejection;
    return applyTypedCode(ctx, row, userId, args.userCode, now);
  },
});

/** Denies a pending request (the browser counterpart of the CLI `denied` poll). */
export const denyAuthorizationRequest = mutation({
  args: {
    ...SessionIdArg,
    requestId: v.string(),
  },
  handler: async (ctx, args): Promise<DenyResult> => {
    await requireAuthUserId(ctx, args);
    const row = await ctx.db
      .query('cliAuthRequests')
      .withIndex('by_requestId', (q) => q.eq('requestId', args.requestId))
      .first();
    if (!row) return { success: false, reason: 'not_found' };

    const now = Date.now();
    const status = effectiveStatus(row, now);
    if (status === 'expired') return { success: false, reason: 'expired' };
    if (row.status !== 'pending') return { success: false, reason: 'already_resolved' };

    await ctx.db.patch('cliAuthRequests', row._id, {
      status: 'denied',
      resolvedAt: now,
    });
    return { success: true };
  },
});

/** Lists the caller's unrevoked CLI credentials, newest first. */
export const listMyCliCredentials = query({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<CliCredentialView[]> => {
    const userId = await requireAuthUserId(ctx, args);
    const now = Date.now();
    const credentials = await ctx.db
      .query('cliCredentials')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(100);
    return credentials
      .filter((credential) => credential.revokedAt === undefined)
      .map((credential) => ({
        id: credential._id,
        machineName: credential.machineName,
        environment: credential.environment,
        createdAt: credential.createdAt,
        lastUsedAt: credential.lastUsedAt,
        expiresAt: credential.expiresAt,
        expired: credential.expiresAt <= now,
      }));
  },
});

/** Revokes one of the caller's CLI credentials. Repeat calls succeed. */
export const revokeCliCredential = mutation({
  args: {
    ...SessionIdArg,
    credentialId: v.id('cliCredentials'),
  },
  handler: async (ctx, args): Promise<RevokeResult> => {
    const userId = await requireAuthUserId(ctx, args);
    const row = await ctx.db.get('cliCredentials', args.credentialId);
    if (!row || row.userId !== userId) return { success: false, reason: 'not_found' };
    if (row.revokedAt !== undefined) return { success: true };
    await ctx.db.patch('cliCredentials', args.credentialId, {
      revokedAt: Date.now(),
      revokedReason: 'user',
    });
    return { success: true };
  },
});
