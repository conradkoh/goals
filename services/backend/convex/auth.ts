import { v } from 'convex/values';
import { requireLogin } from '../src/usecase/requireLogin';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

export const useAnonymousSession = mutation({
  args: {
    sessionId: v.optional(v.union(v.id('sessions'), v.string(), v.null())),
  },
  async handler(ctx, args_0) {
    const { sessionId: prevSessionId } = args_0;
    if (prevSessionId) {
      // check validity
      const prevSession = await ctx.db.get(prevSessionId as Id<'sessions'>);
      if (prevSession && prevSession.status === 'active') {
        // Update lastActiveAt for existing session
        await ctx.db.patch(prevSessionId as Id<'sessions'>, {
          lastActiveAt: Date.now(),
        });
        return prevSessionId as Id<'sessions'>; //return the same one already active
      }
    }
    const displayName = `anonymous${Math.random().toString(36).substring(2, 15)}`;
    const userId = await ctx.db.insert('users', {
      type: 'anonymous',
      displayName: displayName,
    });
    const sessionId = await ctx.db.insert('sessions', {
      userId,
      status: 'active',
      lastActiveAt: Date.now(),
    });
    return sessionId;
  },
});

export const getUser = query({
  args: {
    sessionId: v.id('sessions'),
  },
  async handler(ctx, args) {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    return user;
  },
});
