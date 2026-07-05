import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

async function getOwnedInitiative(
  ctx: MutationCtx,
  initiativeId: Id<'initiatives'>,
  userId: Id<'users'>
): Promise<Doc<'initiatives'>> {
  const initiative = await ctx.db.get('initiatives', initiativeId);
  if (!initiative) throw new ConvexError({ code: 'NOT_FOUND', message: 'Initiative not found' });
  if (initiative.userId !== userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to update this initiative',
    });
  }
  return initiative;
}

// fallow-ignore-next-line complexity
function buildInitiativeUpdates(
  args: {
    title?: string;
    description?: string;
    startDate?: number;
    endDate?: number | null;
  },
  initiative: Doc<'initiatives'>
): Partial<Doc<'initiatives'>> {
  const updates: Partial<Doc<'initiatives'>> = {};
  if (args.title !== undefined) updates.title = args.title.trim();
  if (args.description !== undefined) updates.description = args.description?.trim();
  if (args.startDate !== undefined) updates.startDate = args.startDate;
  if (args.endDate !== undefined) {
    updates.endDate = args.endDate === null ? undefined : args.endDate;
  }

  const nextStart = args.startDate ?? initiative.startDate;
  const nextEnd =
    args.endDate !== undefined
      ? args.endDate === null
        ? undefined
        : args.endDate
      : initiative.endDate;
  if (nextEnd !== undefined && nextStart > nextEnd) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      message: 'Start date must be on or before end date',
    });
  }
  if (args.title !== undefined && !args.title.trim()) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      message: 'Initiative title cannot be empty',
    });
  }

  return updates;
}

export const createInitiative = mutation({
  args: {
    ...SessionIdArg,
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  },
  // fallow-ignore-next-line complexity
  handler: async (ctx, args): Promise<Id<'initiatives'>> => {
    const { sessionId, title, description, startDate, endDate } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Initiative title cannot be empty',
      });
    }
    if (endDate !== undefined && startDate > endDate) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Start date must be on or before end date',
      });
    }

    return await ctx.db.insert('initiatives', {
      userId,
      title: trimmedTitle,
      description: description?.trim(),
      startDate,
      ...(endDate !== undefined ? { endDate } : {}),
    });
  },
});

export const updateInitiative = mutation({
  args: {
    ...SessionIdArg,
    initiativeId: v.id('initiatives'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, initiativeId, title, description, startDate, endDate } = args;
    const user = await requireLogin(ctx, sessionId);
    const initiative = await getOwnedInitiative(ctx, initiativeId, user._id);
    const updates = buildInitiativeUpdates({ title, description, startDate, endDate }, initiative);
    await ctx.db.patch('initiatives', initiativeId, updates);
  },
});

export const deleteInitiative = mutation({
  args: { ...SessionIdArg, initiativeId: v.id('initiatives') },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, initiativeId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const initiative = await ctx.db.get('initiatives', initiativeId);
    if (!initiative) throw new ConvexError({ code: 'NOT_FOUND', message: 'Initiative not found' });
    if (initiative.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to delete this initiative',
      });
    }

    const goalsUsingInitiative = await ctx.db
      .query('goals')
      .withIndex('by_user_and_initiative', (q) =>
        q.eq('userId', userId).eq('initiativeId', initiativeId)
      )
      .collect();

    if (goalsUsingInitiative.length > 0) {
      throw new ConvexError({
        code: 'RESOURCE_IN_USE',
        message: `Cannot delete initiative: ${goalsUsingInitiative.length} goal(s) are tagged to it. Untag them first.`,
      });
    }

    await ctx.db.delete('initiatives', initiativeId);
  },
});

export const getInitiatives = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args): Promise<Doc<'initiatives'>[]> => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    return await ctx.db
      .query('initiatives')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
      .then((items) =>
        items.sort((a, b) => a.startDate - b.startDate || a.title.localeCompare(b.title))
      );
  },
});

export const getInitiative = query({
  args: { ...SessionIdArg, initiativeId: v.id('initiatives') },
  handler: async (ctx, args): Promise<Doc<'initiatives'> | null> => {
    const { sessionId, initiativeId } = args;
    const user = await requireLogin(ctx, sessionId);
    const initiative = await ctx.db.get('initiatives', initiativeId);
    if (!initiative || initiative.userId !== user._id) return null;
    return initiative;
  },
});
