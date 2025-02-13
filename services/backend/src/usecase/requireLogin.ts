import { MutationCtx, QueryCtx } from '../../convex/_generated/server';
import { Id } from '../../convex/_generated/dataModel';

export const requireLogin = async (
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'sessions'>
) => {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error('Login required');
  }
  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
