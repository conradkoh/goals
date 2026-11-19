import type { SessionId } from 'convex-helpers/server/sessions';

import type { SessionResolver } from './session';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../convex/_generated/server';
import { CLI_HANDLE_PREFIX } from '../cli/constants';
import { hashHandle } from '../cli/tokenCrypto';

type DbCtx = QueryCtx | MutationCtx;

/**
 * Looks up the credential row behind a handle and applies the active-state
 * rules (exists, not revoked, not expired). Returns `null` when unusable so
 * callers never see a stale credential.
 */
async function findActiveCredential(ctx: DbCtx, handle: string) {
  const handleHash = await hashHandle(handle); // compute BEFORE the query builder; never await inside the callback
  const row = await ctx.db
    .query('cliCredentials')
    .withIndex('by_handleHash', (q) => q.eq('handleHash', handleHash))
    .first();
  if (!row) return null;
  if (row.revokedAt !== undefined) return null;
  if (row.expiresAt <= Date.now()) return null;
  return row;
}

/**
 * Resolves a CLI credential handle (`cli_…`) to its owning user, or `null` when the handle is not a CLI
 * handle, unknown, revoked or expired. Performs no DB read for non-`cli_` ids (browser sessions).
 * Only used by `requireLogin`; deliberately NOT part of the default auth helpers, so `auth.ts`,
 * `sessions.ts`, `admin/*` and `cli/auth.ts` can never be reached with a CLI credential.
 */
const cliSessionResolver: SessionResolver = async (ctx, sessionId) => {
  if (!sessionId.startsWith(CLI_HANDLE_PREFIX)) return null;
  const row = await findActiveCredential(ctx, sessionId);
  return row?.userId ?? null;
};

/**
 * Authenticates a CLI handle for `requireLogin`, throwing the same errors as the
 * browser-session path so callers cannot distinguish the two.
 */
export async function requireCliUser(ctx: DbCtx, sessionId: SessionId): Promise<Doc<'users'>> {
  const userId: Id<'users'> | null = await cliSessionResolver(ctx, sessionId);
  if (!userId) throw new Error('Login required');
  const user = await ctx.db.get('users', userId);
  if (!user) throw new Error('User not found');
  return user;
}
