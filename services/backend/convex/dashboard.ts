import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';
import { DateTime } from 'luxon';

import { DayOfWeek } from '../src/constants';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import {
  getWeekGoalsTree,
  type QuarterlyGoalSummary,
  type InitiativeQuarterSummary,
  type WeekGoalsTree,
  type WeeklyGoalWithLogs,
  type AdhocGoalWithLogs,
} from '../src/usecase/getWeekDetails';
import { getQuarterWeeks } from '../src/usecase/quarter/getQuarterWeeks';
import { requireLogin } from '../src/usecase/requireLogin';
import { initiativeIdGoalPatch, patchGoalAndPropagateInitiative } from '../src/util/goalInitiative';
import { getRootGoalId } from '../src/util/goalUtils';
import { joinPath, validateGoalPath } from '../src/util/path';

/**
 * Helper function to fetch goal logs by root goal ID.
 * Returns logs sorted by date descending.
 */
async function fetchGoalLogsByRootGoalId(
  ctx: QueryCtx,
  rootGoalId: Id<'goals'>
): Promise<Doc<'goalLogs'>[]> {
  return await ctx.db
    .query('goalLogs')
    .withIndex('by_root_goal_and_date', (q) => q.eq('rootGoalId', rootGoalId))
    .order('desc')
    .collect();
}

/**
 * Helper function to fetch logs for multiple goals efficiently.
 * Returns a map of goal ID -> logs array.
 */
async function fetchLogsForGoals(
  ctx: QueryCtx,
  goals: Doc<'goals'>[]
): Promise<Map<string, Doc<'goalLogs'>[]>> {
  const goalLogsMap = new Map<string, Doc<'goalLogs'>[]>();

  // Get root goal IDs for all goals
  const goalsWithRootIds = goals.map((goal) => ({
    goalId: goal._id,
    rootGoalId: getRootGoalId(goal),
  }));

  // Fetch logs for each unique root goal ID
  const uniqueRootGoalIds = [...new Set(goalsWithRootIds.map((g) => g.rootGoalId))];
  const logsResults = await Promise.all(
    uniqueRootGoalIds.map(async (rootGoalId) => ({
      rootGoalId,
      logs: await fetchGoalLogsByRootGoalId(ctx, rootGoalId),
    }))
  );

  // Map root goal ID to logs
  const rootGoalLogsMap = new Map<string, Doc<'goalLogs'>[]>();
  for (const { rootGoalId, logs } of logsResults) {
    rootGoalLogsMap.set(rootGoalId.toString(), logs);
  }

  // Map each goal ID to its logs (via root goal ID)
  for (const { goalId, rootGoalId } of goalsWithRootIds) {
    const logs = rootGoalLogsMap.get(rootGoalId.toString()) || [];
    goalLogsMap.set(goalId.toString(), logs);
  }

  return goalLogsMap;
}

type WeeklyGoalTreeNode = Awaited<
  ReturnType<typeof getWeekGoalsTree>
>['quarterlyGoals'][number]['children'][number];

const mapWeeklyGoal = (weeklyGoal: WeeklyGoalTreeNode, weekNumber: number, year: number) => ({
  ...weeklyGoal,
  weekNumber,
  weekStartTimestamp: DateTime.fromObject({ weekNumber, weekYear: year })
    .startOf('week')
    .toMillis(),
  weekEndTimestamp: DateTime.fromObject({ weekNumber, weekYear: year }).endOf('week').toMillis(),
});

async function buildQuarterlyGoalSummary(
  ctx: QueryCtx,
  userId: Id<'users'>,
  goalId: Id<'goals'>,
  year: number,
  quarter: number
): Promise<QuarterlyGoalSummary> {
  const quarterlyGoal = await ctx.db.get('goals', goalId);
  if (!quarterlyGoal || quarterlyGoal.userId !== userId) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: `Quarterly goal ${goalId} not found`,
    });
  }
  if (quarterlyGoal.depth !== 0) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Goal ${goalId} is not a quarterly goal`,
    });
  }

  const { weeks, startWeek, endWeek } = getQuarterWeeks(year, quarter);

  const weekResults = await Promise.all(
    weeks.map((weekNum) =>
      getWeekGoalsTree(ctx, {
        userId,
        year,
        quarter,
        weekNumber: weekNum,
      })
    )
  );

  const weeklyGoalsByWeek: Record<number, ReturnType<typeof mapWeeklyGoal>[]> = {};
  let quarterlyGoalDetails: QuarterlyGoalSummary['quarterlyGoal'] | null = null;
  const allGoals: Doc<'goals'>[] = [quarterlyGoal];

  for (const weekTree of weekResults) {
    const targetQuarterlyGoal = weekTree.quarterlyGoals.find((qg) => qg._id === goalId);

    if (targetQuarterlyGoal) {
      if (!quarterlyGoalDetails) {
        quarterlyGoalDetails = {
          _id: targetQuarterlyGoal._id,
          title: targetQuarterlyGoal.title,
          details: targetQuarterlyGoal.details,
          isComplete: targetQuarterlyGoal.isComplete,
          completedAt: targetQuarterlyGoal.completedAt,
          state: targetQuarterlyGoal.state,
        };
      }

      weeklyGoalsByWeek[weekTree.weekNumber] = targetQuarterlyGoal.children.map((weeklyGoal) => {
        allGoals.push(weeklyGoal);
        for (const dailyGoal of weeklyGoal.children) {
          allGoals.push(dailyGoal);
        }
        return mapWeeklyGoal(weeklyGoal, weekTree.weekNumber, year);
      });
    }
  }

  if (!quarterlyGoalDetails) {
    quarterlyGoalDetails = {
      _id: quarterlyGoal._id,
      title: quarterlyGoal.title,
      details: quarterlyGoal.details,
      isComplete: quarterlyGoal.isComplete,
      completedAt: quarterlyGoal.completedAt,
      state: undefined,
    };
  }

  const goalLogsMap = await fetchLogsForGoals(ctx, allGoals);
  const quarterlyGoalLogs = goalLogsMap.get(goalId.toString()) || [];

  const weeklyGoalsByWeekWithLogs: Record<number, WeeklyGoalWithLogs[]> = {};
  for (const [weekNum, weeklyGoals] of Object.entries(weeklyGoalsByWeek)) {
    weeklyGoalsByWeekWithLogs[Number(weekNum)] = weeklyGoals.map((weeklyGoal) => ({
      ...weeklyGoal,
      logs: goalLogsMap.get(weeklyGoal._id.toString()) || [],
      children: weeklyGoal.children.map((dailyGoal) => ({
        ...dailyGoal,
        logs: goalLogsMap.get(dailyGoal._id.toString()) || [],
      })),
    }));
  }

  return {
    quarterlyGoal: {
      ...quarterlyGoalDetails,
      logs: quarterlyGoalLogs,
    },
    weeklyGoalsByWeek: weeklyGoalsByWeekWithLogs,
    quarter,
    year,
    weekRange: { startWeek, endWeek },
  };
}

async function fetchAdhocGoalsForQuarter(
  ctx: QueryCtx,
  userId: Id<'users'>,
  year: number,
  quarter: number,
  filter?: (goal: Doc<'goals'>) => boolean
): Promise<AdhocGoalWithLogs[]> {
  const { weeks } = getQuarterWeeks(year, quarter);
  const results = await Promise.all(
    weeks.map((weekNum) =>
      ctx.db
        .query('goals')
        .withIndex('by_user_and_adhoc_year_week', (q) =>
          q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNum)
        )
        .collect()
    )
  );
  const filteredAdhocGoals = results.flat().filter((goal) => {
    if (!goal.adhoc) return false;
    return filter ? filter(goal) : true;
  });

  if (filteredAdhocGoals.length === 0) return [];

  const adhocGoalLogsMap = await fetchLogsForGoals(ctx, filteredAdhocGoals);
  return filteredAdhocGoals.map((goal) => ({
    ...goal,
    logs: adhocGoalLogsMap.get(goal._id.toString()) || [],
  }));
}

// Get the overview of all weeks in a quarter
export const getQuarterOverview = query({
  args: {
    ...SessionIdArg,
    quarter: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Calculate all week numbers in this quarter using the proper utility
    const { weeks } = getQuarterWeeks(year, quarter);

    // Get details for all weeks in the quarter
    const weekPromises = [];
    for (const weekNum of weeks) {
      weekPromises.push(
        getWeekGoalsTree(ctx, {
          userId,
          year,
          quarter,
          weekNumber: weekNum,
        })
      );
    }

    const weekResults = await Promise.all(weekPromises);
    const weekSummaries = weekResults.reduce(
      (acc, week) => {
        acc[week.weekNumber] = week;
        return acc;
      },
      {} as Record<number, WeekGoalsTree>
    );

    return weekSummaries;
  },
});

export const createQuarterlyGoal = mutation({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    weekNumber: v.number(),
    isPinned: v.optional(v.boolean()),
    isStarred: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter, title, details, dueDate, weekNumber, isPinned, isStarred } =
      args;
    console.log('[Backend] createQuarterlyGoal received:', {
      year,
      quarter,
      title,
      hasDetails: !!details,
      detailsLength: details?.length,
      hasDueDate: dueDate !== undefined,
      dueDate,
      dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
      weekNumber,
      isPinned,
      isStarred,
    });
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate the path for quarterly goals
    const inPath = '/';
    const depth = 0;
    if (!validateGoalPath(depth, inPath)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Invalid path "${inPath}" for quarterly goal`,
      });
    }

    // Create the quarterly goal
    console.log('[Backend] Creating quarterly goal in DB with data:', {
      userId,
      year,
      quarter,
      title,
      hasDetails: !!details,
      hasDueDate: dueDate !== undefined,
      dueDate,
      inPath,
      depth,
    });
    const goalId = await ctx.db.insert('goals', {
      userId,
      year,
      quarter,
      title,
      details,
      dueDate,
      inPath,
      depth, // 0 for quarterly goals
      isComplete: false,
    });
    console.log('[Backend] createQuarterlyGoal created goal:', goalId);

    // Calculate all week numbers in this quarter using the proper utility
    const { weeks } = getQuarterWeeks(year, quarter);

    // Create initial weekly states for this goal (for all weeks in the quarter)
    for (const weekNum of weeks) {
      await ctx.db.insert('goalStateByWeek', {
        userId,
        year,
        quarter,
        goalId,
        weekNumber: weekNum,
        isStarred: weekNum === weekNumber ? (isStarred ?? false) : false,
        isPinned: weekNum === weekNumber ? (isPinned ?? false) : false,
      });
    }

    return goalId;
  },
});

export const updateQuarterlyGoalStatus = mutation({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    weekNumber: v.number(),
    goalId: v.id('goals'),
    isStarred: v.boolean(),
    isPinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter, weekNumber, goalId, isStarred, isPinned } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the weekly goal record
    const weeklyGoal = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', weekNumber)
      )
      .filter((q) => q.eq(q.field('goalId'), goalId))
      .first();

    if (!weeklyGoal) {
      throw new Error('Weekly goal not found');
    }

    // Update the status
    await ctx.db.patch('goalStateByWeek', weeklyGoal._id, {
      isStarred,
      isPinned,
    });

    return weeklyGoal._id;
  },
});

export const updateQuarterlyGoalTitle = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    domainId: v.optional(v.id('domains')),
    initiativeId: v.optional(v.union(v.id('initiatives'), v.null())),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, title, details, dueDate, domainId, initiativeId } = args;
    console.log('[Backend] updateQuarterlyGoalTitle received:', {
      goalId,
      title,
      hasDetails: details !== undefined,
      detailsLength: details?.length,
      hasDueDate: dueDate !== undefined,
      dueDate,
      dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
      hasDomainId: domainId !== undefined,
      domainId,
    });
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const patchData = {
      title,
      ...(details !== undefined ? { details } : {}),
      dueDate,
      ...(domainId !== undefined ? { domainId } : {}),
      ...initiativeIdGoalPatch(initiativeId),
    };
    console.log('[Backend] Patching goal with data:', {
      goalId,
      patchData,
      hasDueDate: 'dueDate' in patchData,
      dueDateValue: patchData.dueDate,
      hasDomainId: 'domainId' in patchData,
      domainIdValue: patchData.domainId,
    });
    await patchGoalAndPropagateInitiative(ctx, goalId, userId, patchData, initiativeId);
    console.log('[Backend] updateQuarterlyGoalTitle completed:', goalId);

    return goalId;
  },
});

export const updateGoalTitle = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    domainId: v.optional(v.id('domains')),
    initiativeId: v.optional(v.union(v.id('initiatives'), v.null())),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, title, details, dueDate, domainId, initiativeId } = args;
    console.log('[Backend] updateGoalTitle received:', {
      goalId,
      title,
      hasDetails: details !== undefined,
      hasDueDate: dueDate !== undefined,
      dueDate,
      hasDomainId: domainId !== undefined,
      domainId,
    });
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const patchData = {
      title,
      ...(details !== undefined ? { details } : {}),
      dueDate,
      ...(domainId !== undefined ? { domainId } : {}),
      ...initiativeIdGoalPatch(initiativeId),
    };
    console.log('[Backend] updateGoalTitle patching with:', patchData);
    await patchGoalAndPropagateInitiative(ctx, goalId, userId, patchData, initiativeId);
    console.log('[Backend] updateGoalTitle completed:', goalId);

    return goalId;
  },
});

export const createWeeklyGoal = mutation({
  args: {
    ...SessionIdArg,
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    parentId: v.id('goals'),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, title, details, dueDate, parentId, weekNumber } = args;
    console.log('[Backend] createWeeklyGoal received:', {
      title,
      hasDetails: !!details,
      hasDueDate: dueDate !== undefined,
      dueDate,
      parentId,
      weekNumber,
    });
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the parent goal to get year and quarter
    const parentGoal = await ctx.db.get('goals', parentId);
    if (!parentGoal) {
      throw new ConvexError('Parent goal not found');
    }
    if (parentGoal.depth !== 0) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Parent must be a quarterly goal (depth 0)',
      });
    }

    // Construct the path
    const inPath = joinPath('/', parentGoal._id);

    // Validate the path
    if (!validateGoalPath(1, inPath)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Invalid path "${inPath}" for weekly goal`,
      });
    }

    // Create the weekly goal
    console.log('[Backend] Creating weekly goal in DB with dueDate:', dueDate);
    const goalId = await ctx.db.insert('goals', {
      userId,
      year: parentGoal.year,
      quarter: parentGoal.quarter,
      title,
      details,
      dueDate,
      parentId,
      inPath,
      depth: 1, // 1 for weekly goals
      isComplete: false,
    });
    console.log('[Backend] createWeeklyGoal created:', goalId);

    // Create initial weekly state
    await ctx.db.insert('goalStateByWeek', {
      userId,
      year: parentGoal.year,
      quarter: parentGoal.quarter,
      goalId,
      weekNumber,
      isStarred: false,
      isPinned: false,
    });

    return goalId;
  },
});

export const createDailyGoal = mutation({
  args: {
    ...SessionIdArg,
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    parentId: v.id('goals'),
    weekNumber: v.number(),
    dayOfWeek: v.union(
      v.literal(DayOfWeek.MONDAY),
      v.literal(DayOfWeek.TUESDAY),
      v.literal(DayOfWeek.WEDNESDAY),
      v.literal(DayOfWeek.THURSDAY),
      v.literal(DayOfWeek.FRIDAY),
      v.literal(DayOfWeek.SATURDAY),
      v.literal(DayOfWeek.SUNDAY)
    ),
    dateTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('[Backend] createDailyGoal received:', {
      title: args.title,
      hasDetails: !!args.details,
      hasDueDate: args.dueDate !== undefined,
      dueDate: args.dueDate,
      parentId: args.parentId,
      weekNumber: args.weekNumber,
      dayOfWeek: args.dayOfWeek,
    });
    const user = await requireLogin(ctx, args.sessionId);
    const userId = user._id;

    // Get the weekly parent goal
    const weeklyParent = await ctx.db.get('goals', args.parentId);
    if (!weeklyParent) {
      throw new Error('Parent goal not found');
    }
    if (weeklyParent.depth !== 1) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Parent must be a weekly goal (depth 1)',
      });
    }

    // Get the quarterly parent goal
    const quarterlyParentId = weeklyParent.parentId;
    if (!quarterlyParentId) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Weekly goal has no quarterly parent',
      });
    }

    // Construct the path
    const inPath = joinPath('/', quarterlyParentId, weeklyParent._id);

    // Validate the path
    if (!validateGoalPath(2, inPath)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Invalid path "${inPath}" for daily goal`,
      });
    }

    // Create the goal
    console.log('[Backend] Creating daily goal in DB with dueDate:', args.dueDate);
    const goalId = await ctx.db.insert('goals', {
      userId,
      year: weeklyParent.year,
      quarter: weeklyParent.quarter,
      title: args.title,
      details: args.details,
      dueDate: args.dueDate,
      parentId: args.parentId,
      inPath,
      depth: 2, // Daily goals are depth 2
      isComplete: false,
    });
    console.log('[Backend] createDailyGoal created:', goalId);

    // Create the weekly goal data
    await ctx.db.insert('goalStateByWeek', {
      userId,
      year: weeklyParent.year,
      quarter: weeklyParent.quarter,
      weekNumber: args.weekNumber,
      goalId,
      isStarred: false,
      isPinned: false,
      daily: {
        dayOfWeek: args.dayOfWeek,
        ...(args.dateTimestamp ? { dateTimestamp: args.dateTimestamp } : {}),
      },
    });

    return goalId;
  },
});

export const toggleGoalCompletion = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    weekNumber: v.number(),
    isComplete: v.boolean(),
    updateChildren: v.optional(v.boolean()),
    // Optional parameters for client-side optimistic updates
    year: v.optional(v.number()),
    quarter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, weekNumber, isComplete, updateChildren } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to update this goal',
      });
    }

    // Find the weekly goal record
    const weeklyGoal = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('weekNumber', weekNumber)
      )
      .filter((q) => q.eq(q.field('goalId'), goalId))
      .first();

    if (!weeklyGoal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Weekly goal not found',
      });
    }

    // Update the completion status in goalStateByWeek (for backward compatibility)
    await ctx.db.patch('goalStateByWeek', weeklyGoal._id, {
      // Remove isComplete and completedAt fields as they've been migrated to the goals table
    });

    // Also update the goal table directly
    await ctx.db.patch('goals', goalId, {
      isComplete,
      completedAt: isComplete ? Date.now() : undefined,
    });

    // If this is a weekly goal (depth 1) and updateChildren is true, update all child goals
    if (goal.depth === 1 && updateChildren) {
      // Find all child goals using the inPath
      const childGoals = await ctx.db
        .query('goals')
        .withIndex('by_user_and_year_and_quarter', (q) =>
          q.eq('userId', userId).eq('year', goal.year).eq('quarter', goal.quarter)
        )
        .filter((q) => q.eq(q.field('parentId'), goalId))
        .collect();

      // Update all child goals' weekly states and goal records in parallel
      await Promise.all(
        childGoals.map(async (childGoal) => {
          const childWeeklyGoal = await ctx.db
            .query('goalStateByWeek')
            .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
              q
                .eq('userId', userId)
                .eq('year', goal.year)
                .eq('quarter', goal.quarter)
                .eq('weekNumber', weekNumber)
            )
            .filter((q) => q.eq(q.field('goalId'), childGoal._id))
            .first();

          if (childWeeklyGoal) {
            await ctx.db.patch('goalStateByWeek', childWeeklyGoal._id, {
              // Remove isComplete and completedAt fields as they've been migrated to the goals table
            });
          }

          // Update the child goal record directly as well
          await ctx.db.patch('goals', childGoal._id, {
            isComplete,
            completedAt: isComplete ? Date.now() : undefined,
          });
        })
      );
    }

    return weeklyGoal._id;
  },
});

export const updateDailyGoalDay = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    weekNumber: v.number(),
    newDayOfWeek: v.union(
      v.literal(DayOfWeek.MONDAY),
      v.literal(DayOfWeek.TUESDAY),
      v.literal(DayOfWeek.WEDNESDAY),
      v.literal(DayOfWeek.THURSDAY),
      v.literal(DayOfWeek.FRIDAY),
      v.literal(DayOfWeek.SATURDAY),
      v.literal(DayOfWeek.SUNDAY)
    ),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, weekNumber, newDayOfWeek } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to update this goal',
      });
    }

    // Find the weekly goal record
    const weeklyGoal = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('weekNumber', weekNumber)
      )
      .filter((q) => q.eq(q.field('goalId'), goalId))
      .first();

    if (!weeklyGoal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Weekly goal not found',
      });
    }

    // Update the day of week
    await ctx.db.patch('goalStateByWeek', weeklyGoal._id, {
      daily: {
        ...weeklyGoal.daily,
        dayOfWeek: newDayOfWeek,
      },
    });

    return weeklyGoal._id;
  },
});

export const useDailyGoal = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    weekNumber: v.number(),
    dayOfWeek: v.union(
      v.literal(DayOfWeek.MONDAY),
      v.literal(DayOfWeek.TUESDAY),
      v.literal(DayOfWeek.WEDNESDAY),
      v.literal(DayOfWeek.THURSDAY),
      v.literal(DayOfWeek.FRIDAY),
      v.literal(DayOfWeek.SATURDAY),
      v.literal(DayOfWeek.SUNDAY)
    ),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, weekNumber, dayOfWeek } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the goal details
    const goal = await ctx.db.get('goals', goalId);
    if (!goal || goal.userId !== userId) {
      return null;
    }

    // Get the weekly state for this goal using the optimized index
    const weeklyGoal = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week_and_daily', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('weekNumber', weekNumber)
          .eq('daily.dayOfWeek', dayOfWeek)
          .eq('goalId', goalId)
      )
      .first();

    return {
      title: goal.title,
      details: goal.details,
      isComplete: goal.isComplete,
      isPinned: weeklyGoal?.isPinned ?? false,
      isStarred: weeklyGoal?.isStarred ?? false,
      completedAt: goal.completedAt,
      weekNumber: weeklyGoal?.weekNumber,
      dayOfWeek: weeklyGoal?.daily?.dayOfWeek,
    };
  },
});

// Get details for a specific week
export const getWeek = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter, weekNumber } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the week details directly
    const weekTree = await getWeekGoalsTree(ctx, {
      userId,
      year,
      quarter,
      weekNumber,
    });

    // Calculate the days for this week
    const weekStart = DateTime.fromObject({
      weekNumber,
      weekYear: year,
    }).startOf('week');

    const days = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: (i + 1) as DayOfWeek,
      date: weekStart.plus({ days: i }).toFormat('LLL d'),
      dateTimestamp: weekStart.plus({ days: i }).toMillis(),
    }));

    return {
      weekLabel: `Week ${weekNumber}`,
      weekNumber,
      mondayDate: weekStart.toFormat('LLL d'),
      days,
      tree: weekTree,
    };
  },
});

// Get comprehensive quarterly goal summary with all weekly and daily goals
export const getQuarterlyGoalSummary = query({
  args: {
    ...SessionIdArg,
    quarterlyGoalId: v.id('goals'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, quarterlyGoalId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);

    return buildQuarterlyGoalSummary(ctx, user._id, quarterlyGoalId, year, quarter);
  },
});

// Get all quarterly goals for a specific quarter (for selection UI)
export const getAllQuarterlyGoalsForQuarter = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all quarterly goals (depth 0) for the specified quarter
    const quarterlyGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .filter((q) => q.eq(q.field('depth'), 0))
      .collect();

    // Get weekly goal counts for each quarterly goal
    const goalsWithCounts = await Promise.all(
      quarterlyGoals.map(async (goal) => {
        // Count weekly goals (depth 1) that are children of this quarterly goal
        const weeklyGoals = await ctx.db
          .query('goals')
          .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
            q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', goal._id)
          )
          .filter((q) => q.eq(q.field('depth'), 1))
          .collect();

        const totalWeeklyGoals = weeklyGoals.length;
        const completedWeeklyGoals = weeklyGoals.filter((wg) => wg.isComplete).length;

        return {
          _id: goal._id,
          title: goal.title,
          isComplete: goal.isComplete,
          completedAt: goal.completedAt,
          weeklyGoalCount: totalWeeklyGoals,
          completedWeeklyGoalCount: completedWeeklyGoals,
        };
      })
    );

    return goalsWithCounts;
  },
});

// Get comprehensive summary for the quarter, including selected quarterly goals and optionally adhoc goals
export const getQuarterSummary = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    selectedQuarterlyGoalIds: v.optional(v.array(v.id('goals'))),
    includeAdhocGoals: v.optional(v.boolean()),
    adhocDomainIds: v.optional(v.array(v.union(v.id('domains'), v.literal('UNCATEGORIZED')))),
  },
  handler: async (ctx, args) => {
    const {
      sessionId,
      year,
      quarter,
      selectedQuarterlyGoalIds,
      includeAdhocGoals,
      adhocDomainIds,
    } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const quarterlyGoalIds = selectedQuarterlyGoalIds || [];

    const quarterlyGoals = await Promise.all(
      quarterlyGoalIds.map((goalId) =>
        buildQuarterlyGoalSummary(ctx, userId, goalId, year, quarter)
      )
    );

    let adhocGoals: AdhocGoalWithLogs[] = [];
    if (includeAdhocGoals) {
      adhocGoals = await fetchAdhocGoalsForQuarter(ctx, userId, year, quarter, (goal) => {
        if (adhocDomainIds && adhocDomainIds.length > 0) {
          const includeUncategorized = adhocDomainIds.some((id) => id === 'UNCATEGORIZED');
          const effectiveDomainId = goal.domainId;
          if (!effectiveDomainId) return includeUncategorized;
          return adhocDomainIds.includes(effectiveDomainId);
        }
        return true;
      });
    }

    const { startWeek, endWeek } = getQuarterWeeks(year, quarter);
    const weekRange = quarterlyGoals[0]?.weekRange || {
      startWeek,
      endWeek,
    };

    return {
      quarterlyGoals,
      adhocGoals: adhocGoals.length > 0 ? adhocGoals : undefined,
      year,
      quarter,
      weekRange,
    };
  },
});

// Initiative-centric quarterly summary for selected initiatives
export const getInitiativeQuarterSummary = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    selectedInitiativeIds: v.array(v.id('initiatives')),
  },
  handler: async (ctx, args): Promise<InitiativeQuarterSummary> => {
    const { sessionId, year, quarter, selectedInitiativeIds } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;
    const { startWeek, endWeek } = getQuarterWeeks(year, quarter);

    const initiatives = await Promise.all(
      selectedInitiativeIds.map(async (initiativeId) => {
        const initiative = await ctx.db.get('initiatives', initiativeId);
        if (!initiative || initiative.userId !== userId) {
          throw new ConvexError({
            code: 'NOT_FOUND',
            message: `Initiative ${initiativeId} not found`,
          });
        }

        const taggedGoals = await ctx.db
          .query('goals')
          .withIndex('by_user_and_initiative', (q) =>
            q.eq('userId', userId).eq('initiativeId', initiativeId)
          )
          .collect();

        const quarterlyGoalIds = taggedGoals
          .filter((goal) => goal.depth === 0 && goal.year === year && goal.quarter === quarter)
          .map((goal) => goal._id);

        const quarterlyGoals = await Promise.all(
          quarterlyGoalIds.map((goalId) =>
            buildQuarterlyGoalSummary(ctx, userId, goalId, year, quarter)
          )
        );

        const adhocGoals = await fetchAdhocGoalsForQuarter(
          ctx,
          userId,
          year,
          quarter,
          (goal) => goal.initiativeId === initiativeId
        );

        return {
          initiative: {
            _id: initiative._id,
            title: initiative.title,
            description: initiative.description,
            startDate: initiative.startDate,
            endDate: initiative.endDate,
          },
          quarterlyGoals,
          adhocGoals: adhocGoals.length > 0 ? adhocGoals : undefined,
        };
      })
    );

    return {
      initiatives,
      year,
      quarter,
      weekRange: { startWeek, endWeek },
    };
  },
});

// Get adhoc goal counts per domain for a specific quarter (for selection UI)
export const getAdhocGoalCountsByDomainForQuarter = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all weeks in the quarter
    const { weeks } = getQuarterWeeks(year, quarter);

    // Query adhoc goals for all weeks in the quarter
    const adhocPromises = weeks.map((weekNum) =>
      ctx.db
        .query('goals')
        .withIndex('by_user_and_adhoc_year_week', (q) =>
          q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNum)
        )
        .collect()
    );
    const results = await Promise.all(adhocPromises);
    const allAdhocGoals = results.flat().filter((goal) => goal.adhoc);

    // Count goals per domain
    const countsByDomain: Record<string, { total: number; completed: number }> = {};

    for (const goal of allAdhocGoals) {
      const domainKey = goal.domainId || 'UNCATEGORIZED';
      if (!countsByDomain[domainKey]) {
        countsByDomain[domainKey] = { total: 0, completed: 0 };
      }
      countsByDomain[domainKey].total++;
      if (goal.isComplete) {
        countsByDomain[domainKey].completed++;
      }
    }

    return countsByDomain;
  },
});

/**
 * Retrieves detailed information about a single goal.
 * Used for preview dialogs and standalone goal popovers.
 *
 * @public
 * @param sessionId - Session ID for authentication
 * @param goalId - ID of the goal to retrieve
 * @returns Goal details including domain, state, and children, or null if not found
 */
export const getGoalDetails = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the goal
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      return null;
    }

    // Verify ownership
    if (goal.userId !== userId) {
      return null;
    }

    // Get domain if exists
    let domain: Doc<'domains'> | null = null;
    if (goal.domainId) {
      domain = await ctx.db.get('domains', goal.domainId);
    }

    // Get goal state for the most recent week (for quarterly goals)
    let state: { isStarred: boolean; isPinned: boolean } | null = null;
    if (goal.depth === 0) {
      // Quarterly goal - get latest state
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
          q
            .eq('userId', userId)
            .eq('goalId', goalId)
            .eq('year', goal.year)
            .eq('quarter', goal.quarter)
        )
        .order('desc')
        .take(1);

      if (states.length > 0) {
        state = {
          isStarred: states[0].isStarred ?? false,
          isPinned: states[0].isPinned ?? false,
        };
      }
    }

    // Get children (weekly goals for quarterly, or adhoc children)
    const children = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('parentId', goalId)
      )
      .collect();

    // Resolve parent and grandparent titles for breadcrumb context
    let parentTitle: string | undefined;
    let grandParentTitle: string | undefined;
    let grandParentId: Id<'goals'> | undefined;
    if (goal.parentId) {
      const parent = await ctx.db.get('goals', goal.parentId);
      if (parent) {
        parentTitle = parent.title;
        if (parent.parentId) {
          const grandParent = await ctx.db.get('goals', parent.parentId);
          if (grandParent) {
            grandParentTitle = grandParent.title;
            grandParentId = grandParent._id;
          }
        }
      }
    }

    return {
      _id: goal._id,
      _creationTime: goal._creationTime,
      title: goal.title,
      details: goal.details,
      isComplete: goal.isComplete,
      isBacklog: goal.isBacklog ?? false,
      completedAt: goal.completedAt,
      dueDate: goal.dueDate,
      depth: goal.depth,
      parentId: goal.parentId,
      parentTitle,
      grandParentTitle,
      grandParentId,
      domainId: goal.domainId,
      initiativeId: goal.initiativeId,
      year: goal.year,
      quarter: goal.quarter,
      adhoc: goal.adhoc,
      domain,
      state,
      children: children.map((child) => ({
        _id: child._id,
        title: child.title,
        isComplete: child.isComplete,
      })),
    };
  },
});
