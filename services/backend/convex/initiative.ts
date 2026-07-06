import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { InitiativeQuarterOption } from '../src/usecase/getWeekDetails';
import { getQuarterWeeks } from '../src/usecase/quarter/getQuarterWeeks';
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

export type InitiativeGoalGroup = 'quarterly' | 'weekly' | 'daily' | 'adhoc';

export type GoalsByInitiative = {
  quarterly: Doc<'goals'>[];
  weekly: Doc<'goals'>[];
  daily: Doc<'goals'>[];
  adhoc: Doc<'goals'>[];
};

// fallow-ignore-next-line complexity
export function classifyInitiativeGoal(goal: Doc<'goals'>): InitiativeGoalGroup {
  if (goal.adhoc !== undefined || goal.depth === -1) return 'adhoc';
  if (goal.depth === 0) return 'quarterly';
  if (goal.depth === 1) return 'weekly';
  return 'daily';
}

function sortGoalsByGroup(group: InitiativeGoalGroup, goals: Doc<'goals'>[]): Doc<'goals'>[] {
  const sorted = [...goals];
  if (group === 'adhoc') {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (group === 'daily') {
    return sorted.sort(
      (a, b) => a.inPath.localeCompare(b.inPath) || a.title.localeCompare(b.title)
    );
  }
  return sorted.sort(
    (a, b) => a.year - b.year || a.quarter - b.quarter || a.title.localeCompare(b.title)
  );
}

export const getInitiativeGoalCounts = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args): Promise<Record<string, { total: number; open: number }>> => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const initiatives = await ctx.db
      .query('initiatives')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const counts: Record<string, { total: number; open: number }> = {};

    await Promise.all(
      initiatives.map(async (initiative) => {
        const goals = await ctx.db
          .query('goals')
          .withIndex('by_user_and_initiative', (q) =>
            q.eq('userId', user._id).eq('initiativeId', initiative._id)
          )
          .collect();
        counts[initiative._id] = {
          total: goals.length,
          open: goals.filter((g) => !g.isComplete).length,
        };
      })
    );

    return counts;
  },
});

export const getGoalsByInitiative = query({
  args: {
    ...SessionIdArg,
    initiativeId: v.id('initiatives'),
  },
  handler: async (ctx, args): Promise<GoalsByInitiative> => {
    const { sessionId, initiativeId } = args;
    const user = await requireLogin(ctx, sessionId);

    const initiative = await ctx.db.get('initiatives', initiativeId);
    if (!initiative || initiative.userId !== user._id) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Initiative not found' });
    }

    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_initiative', (q) =>
        q.eq('userId', user._id).eq('initiativeId', initiativeId)
      )
      .collect();

    const grouped: GoalsByInitiative = { quarterly: [], weekly: [], daily: [], adhoc: [] };
    for (const goal of goals) {
      grouped[classifyInitiativeGoal(goal)].push(goal);
    }

    return {
      quarterly: sortGoalsByGroup('quarterly', grouped.quarterly),
      weekly: sortGoalsByGroup('weekly', grouped.weekly),
      daily: sortGoalsByGroup('daily', grouped.daily),
      adhoc: sortGoalsByGroup('adhoc', grouped.adhoc),
    };
  },
});

// fallow-ignore-next-line complexity
function isGoalInQuarter(
  goal: Doc<'goals'>,
  year: number,
  quarter: number,
  weeks: number[]
): boolean {
  if (goal.adhoc !== undefined || goal.depth === -1) {
    return goal.year === year && goal.adhoc !== undefined && weeks.includes(goal.adhoc.weekNumber);
  }
  return goal.year === year && goal.quarter === quarter;
}

function initiativeOverlapsQuarter(
  initiative: Doc<'initiatives'>,
  quarterStartMs: number,
  quarterEndMs: number
): boolean {
  if (initiative.startDate > quarterEndMs) return false;
  if (initiative.endDate !== undefined && initiative.endDate < quarterStartMs) return false;
  return true;
}

export const getInitiativesForQuarter = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args): Promise<InitiativeQuarterOption[]> => {
    const { sessionId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const { weeks, startDate, endDate } = getQuarterWeeks(year, quarter);
    const quarterStartMs = startDate.startOf('day').toMillis();
    const quarterEndMs = endDate.endOf('day').toMillis();

    const initiatives = await ctx.db
      .query('initiatives')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const options: InitiativeQuarterOption[] = [];

    for (const initiative of initiatives) {
      if (!initiativeOverlapsQuarter(initiative, quarterStartMs, quarterEndMs)) continue;

      const taggedGoals = await ctx.db
        .query('goals')
        .withIndex('by_user_and_initiative', (q) =>
          q.eq('userId', userId).eq('initiativeId', initiative._id)
        )
        .collect();

      const goalsInQuarter = taggedGoals.filter((goal) =>
        isGoalInQuarter(goal, year, quarter, weeks)
      );

      options.push({
        _id: initiative._id,
        title: initiative.title,
        description: initiative.description,
        startDate: initiative.startDate,
        endDate: initiative.endDate,
        goalCountInQuarter: goalsInQuarter.length,
        quarterlyGoalCount: goalsInQuarter.filter((g) => g.depth === 0).length,
        adhocGoalCount: goalsInQuarter.filter((g) => g.adhoc !== undefined || g.depth === -1)
          .length,
      });
    }

    return options.sort((a, b) => a.startDate - b.startDate || a.title.localeCompare(b.title));
  },
});
