import type { SessionId } from 'convex-helpers/server/sessions';

import type { Id } from '../../convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../convex/_generated/server';
import { requireCliUser } from '../../modules/auth/cli-session';
import { CLI_HANDLE_PREFIX } from '../../modules/cli/constants';

/**
 * Requires a valid authenticated session and returns the user.
 * Supports both template pattern (string sessionId field) and legacy pattern (document _id).
 * `cli_`-prefixed ids are resolved only through the CLI credential resolver and never fall through
 * to the `sessions` table.
 *
 * @param ctx - Query or mutation context
 * @param sessionId - Either a string sessionId (template pattern) or Id<'sessions'> (legacy pattern)
 */
export const requireLogin = async (
  ctx: QueryCtx | MutationCtx,
  sessionId: string | Id<'sessions'>
) => {
  if (typeof sessionId === 'string' && sessionId.startsWith(CLI_HANDLE_PREFIX)) {
    // CLI credential handles are resolved ONLY from `cliCredentials`; they never fall through to `sessions`
    // (a browser client can create an arbitrary-id `sessions` row via loginAnon).
    return requireCliUser(ctx, sessionId as SessionId);
  }

  // Try template pattern first: look up by sessionId field
  let session = await ctx.db
    .query('sessions')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', sessionId as string))
    .first();

  // Fall back to legacy pattern: direct document lookup
  if (!session && sessionId) {
    try {
      session = await ctx.db.get('sessions', sessionId as Id<'sessions'>);
    } catch {
      // Invalid ID format, session stays null
    }
  }

  const userId = session?.userId;
  if (!userId) {
    throw new Error('Login required');
  }
  const user = await ctx.db.get('users', userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
