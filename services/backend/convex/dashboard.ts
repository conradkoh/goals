import { ConvexError, v } from 'convex/values';
import { DateTime } from 'luxon';
import { DayOfWeek } from '../src/constants';
import { getWeekGoalsTree, type WeekGoalsTree } from '../src/usecase/getWeekDetails';
import { getQuarterWeeks } from '../src/usecase/quarter/getQuarterWeeks';
import { requireLogin } from '../src/usecase/requireLogin';
import { joinPath, validateGoalPath } from '../src/util/path';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

// Get the overview of all weeks in a quarter
export const getQuarterOverview = query({
  args: {
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
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
    await ctx.db.patch(weeklyGoal._id, {
      isStarred,
      isPinned,
    });

    return weeklyGoal._id;
  },
});

export const updateQuarterlyGoalTitle = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    domainId: v.optional(v.id('domains')),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, title, details, dueDate, domainId } = args;
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
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Update the goal title, details, dueDate, and domainId
    // Always include dueDate and domainId keys to allow unsetting when undefined
    const patchData = {
      title,
      ...(details !== undefined ? { details } : {}),
      // Include the key even when value is undefined so Convex unsets the optional field
      dueDate,
      ...(domainId !== undefined ? { domainId } : {}),
    };
    console.log('[Backend] Patching goal with data:', {
      goalId,
      patchData,
      hasDueDate: 'dueDate' in patchData,
      dueDateValue: patchData.dueDate,
      hasDomainId: 'domainId' in patchData,
      domainIdValue: patchData.domainId,
    });
    await ctx.db.patch(goalId, patchData);
    console.log('[Backend] updateQuarterlyGoalTitle completed:', goalId);

    return goalId;
  },
});

export const updateGoalTitle = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    domainId: v.optional(v.id('domains')),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, title, details, dueDate, domainId } = args;
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
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Update the goal title, details, dueDate, and domainId
    // Always include dueDate and domainId keys to allow unsetting when undefined
    const patchData = {
      title,
      ...(details !== undefined ? { details } : {}),
      // Include the key even when value is undefined so Convex unsets the optional field
      dueDate,
      ...(domainId !== undefined ? { domainId } : {}),
    };
    console.log('[Backend] updateGoalTitle patching with:', patchData);
    await ctx.db.patch(goalId, patchData);
    console.log('[Backend] updateGoalTitle completed:', goalId);

    return goalId;
  },
});

export const createWeeklyGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
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
    const parentGoal = await ctx.db.get(parentId);
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
    sessionId: v.id('sessions'),
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
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    const { userId } = session;

    // Get the weekly parent goal
    const weeklyParent = await ctx.db.get(args.parentId);
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
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    weekNumber: v.number(),
    isComplete: v.boolean(),
    updateChildren: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, weekNumber, isComplete, updateChildren } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get(goalId);
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
    await ctx.db.patch(weeklyGoal._id, {
      // Remove isComplete and completedAt fields as they've been migrated to the goals table
    });

    // Also update the goal table directly
    await ctx.db.patch(goalId, {
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
            await ctx.db.patch(childWeeklyGoal._id, {
              // Remove isComplete and completedAt fields as they've been migrated to the goals table
            });
          }

          // Update the child goal record directly as well
          await ctx.db.patch(childGoal._id, {
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
    sessionId: v.id('sessions'),
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
    const goal = await ctx.db.get(goalId);
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
    await ctx.db.patch(weeklyGoal._id, {
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
    sessionId: v.id('sessions'),
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
    const goal = await ctx.db.get(goalId);
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
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
    quarterlyGoalId: v.id('goals'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, quarterlyGoalId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Verify the quarterly goal exists and belongs to the user
    const quarterlyGoal = await ctx.db.get(quarterlyGoalId);
    if (!quarterlyGoal || quarterlyGoal.userId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Quarterly goal not found',
      });
    }

    // Verify it's actually a quarterly goal (depth 0)
    if (quarterlyGoal.depth !== 0) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Goal is not a quarterly goal',
      });
    }

    // Calculate all week numbers in this quarter using the proper utility
    const { weeks, startWeek, endWeek } = getQuarterWeeks(year, quarter);

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

    // Find the quarterly goal in each week's data and extract its weekly/daily goals
    const weeklyGoalsByWeek: Record<number, ReturnType<typeof mapWeeklyGoal>[]> = {};
    let quarterlyGoalDetails = null;

    for (const weekTree of weekResults) {
      const targetQuarterlyGoal = weekTree.quarterlyGoals.find((qg) => qg._id === quarterlyGoalId);

      if (targetQuarterlyGoal) {
        // Store quarterly goal details (from first occurrence)
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

        // Store weekly goals for this week
        weeklyGoalsByWeek[weekTree.weekNumber] = targetQuarterlyGoal.children.map((weeklyGoal) =>
          mapWeeklyGoal(weeklyGoal, weekTree.weekNumber, year)
        );
      }
    }

    if (!quarterlyGoalDetails) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Quarterly goal not found in any week data',
      });
    }

    return {
      quarterlyGoal: quarterlyGoalDetails,
      weeklyGoalsByWeek,
      quarter,
      year,
      weekRange: {
        startWeek,
        endWeek,
      },
    };
  },
});

// Get all quarterly goals for a specific quarter (for selection UI)
export const getAllQuarterlyGoalsForQuarter = query({
  args: {
    sessionId: v.id('sessions'),
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

    return quarterlyGoals.map((goal) => ({
      _id: goal._id,
      title: goal.title,
      isComplete: goal.isComplete,
      selected: true, // Default to selected
    }));
  },
});

// Get comprehensive summary for the quarter, including selected quarterly goals and optionally adhoc goals
export const getQuarterSummary = query({
  args: {
    sessionId: v.id('sessions'),
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

    // Get summaries for each quarterly goal
    const summaryPromises = quarterlyGoalIds.map(async (goalId) => {
      // Verify the quarterly goal exists and belongs to the user
      const quarterlyGoal = await ctx.db.get(goalId);
      if (!quarterlyGoal || quarterlyGoal.userId !== userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: `Quarterly goal ${goalId} not found`,
        });
      }
      // ... rest of map implementation
      // Verify it's actually a quarterly goal (depth 0)
      if (quarterlyGoal.depth !== 0) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: `Goal ${goalId} is not a quarterly goal`,
        });
      }

      // Calculate all week numbers in this quarter using the proper utility
      const { weeks, startWeek, endWeek } = getQuarterWeeks(year, quarter);

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

      // Find the quarterly goal in each week's data and extract its weekly/daily goals
      const weeklyGoalsByWeek: Record<number, ReturnType<typeof mapWeeklyGoal>[]> = {};
      let quarterlyGoalDetails = null;

      for (const weekTree of weekResults) {
        const targetQuarterlyGoal = weekTree.quarterlyGoals.find((qg) => qg._id === goalId);

        if (targetQuarterlyGoal) {
          // Store quarterly goal details (from first occurrence)
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

          // Store weekly goals for this week
          weeklyGoalsByWeek[weekTree.weekNumber] = targetQuarterlyGoal.children.map((weeklyGoal) =>
            mapWeeklyGoal(weeklyGoal, weekTree.weekNumber, year)
          );
        }
      }

      // If the goal wasn't found in any week data, it means it has no weekly goals assigned yet
      // In this case, use the quarterly goal data we already fetched
      if (!quarterlyGoalDetails) {
        quarterlyGoalDetails = {
          _id: quarterlyGoal._id,
          title: quarterlyGoal.title,
          details: quarterlyGoal.details,
          isComplete: quarterlyGoal.isComplete,
          completedAt: quarterlyGoal.completedAt,
          state: undefined, // No state since it's not in any week
        };
      }

      return {
        quarterlyGoal: quarterlyGoalDetails,
        weeklyGoalsByWeek,
        quarter,
        year,
        weekRange: {
          startWeek,
          endWeek,
        },
      };
    });

    const quarterlyGoals = await Promise.all(summaryPromises);

    // Fetch adhoc goals if requested
    let adhocGoals: Doc<'goals'>[] = [];
    if (includeAdhocGoals) {
      const { weeks } = getQuarterWeeks(year, quarter);
      const adhocPromises = weeks.map((weekNum) =>
        ctx.db
          .query('goals')
          .withIndex('by_user_and_adhoc_year_week', (q) =>
            q.eq('userId', userId).eq('adhoc.year', year).eq('adhoc.weekNumber', weekNum)
          )
          .collect()
      );
      const results = await Promise.all(adhocPromises);
      adhocGoals = results.flat().filter((goal) => {
        if (!goal.adhoc) return false;
        // Filter by domain if specific domains are selected
        if (adhocDomainIds && adhocDomainIds.length > 0) {
          // Check if UNCATEGORIZED is in the selection
          const includeUncategorized = adhocDomainIds.some((id) => id === 'UNCATEGORIZED');

          // Get effective domain ID (goal.domainId with fallback to goal.adhoc.domainId)
          const effectiveDomainId = goal.domainId || goal.adhoc.domainId;

          // If goal has no domain
          if (!effectiveDomainId) {
            // Include it only if UNCATEGORIZED is selected
            return includeUncategorized;
          }

          // If goal has a domain, check if it's in the selected domains
          return adhocDomainIds.includes(effectiveDomainId);
        }
        return true;
      });
    }

    // Calculate overall week range from the first goal (should be the same for all)
    // If no quarterly goals, calculate from quarter dates
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
