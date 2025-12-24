import type { Id } from '../../convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../convex/_generated/server';

/**
 * Requires a valid authenticated session and returns the user.
 * Supports both template pattern (string sessionId field) and legacy pattern (document _id).
 *
 * @param ctx - Query or mutation context
 * @param sessionId - Either a string sessionId (template pattern) or Id<'sessions'> (legacy pattern)
 */
export const requireLogin = async (
  ctx: QueryCtx | MutationCtx,
  sessionId: string | Id<'sessions'>
) => {
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

  if (!session) {
    throw new Error('Login required');
  }
  const user = await ctx.db.get('users', session.userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
