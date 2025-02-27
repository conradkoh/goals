import { v } from 'convex/values';
import { requireLogin } from '../src/usecase/requireLogin';
import { internalMutation, mutation } from './_generated/server';
import { moveGoalsFromWeekUsecase } from '../src/usecase/moveGoalsFromWeek/moveGoalsFromWeek';
import { DayOfWeek, getDayName } from '../src/constants';
import { Id, Doc } from './_generated/dataModel';
import { internal } from './_generated/api';

export const moveGoalsFromWeek = mutation({
  args: {
    sessionId: v.id('sessions'),
    from: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const result = await moveGoalsFromWeekUsecase(ctx, {
      userId,
      from,
      to,
      dryRun: dryRun ?? false,
    });

    return result;
  },
});

export const moveGoalsFromDay = mutation({
  args: {
    sessionId: v.id('sessions'),
    from: v.object({
      year: v.number(),
      quarter: v.number(),
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
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
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
    }),
    dryRun: v.optional(v.boolean()),
    moveOnlyIncomplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun, moveOnlyIncomplete = true } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // === STAGE 1: Identify goals to move ===

    // Find all daily goals from the source day
    const allGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', from.weekNumber)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field('daily'), undefined),
          q.eq(q.field('daily.dayOfWeek'), from.dayOfWeek)
        )
      )
      .collect();

    // Filter to only include incomplete goals if moveOnlyIncomplete is true
    const filteredGoalStates = moveOnlyIncomplete
      ? allGoalStates.filter((weeklyGoal) => !weeklyGoal.isComplete)
      : allGoalStates;

    // Get full details for each goal
    const tasksWithFullDetails = await Promise.all(
      filteredGoalStates.map(async (weeklyGoal) => {
        const dailyGoal = await ctx.db.get(weeklyGoal.goalId);
        if (!dailyGoal || dailyGoal.userId !== userId) return null;

        const weeklyParent = await ctx.db.get(
          dailyGoal?.parentId as Id<'goals'>
        );
        if (!weeklyParent || weeklyParent.userId !== userId) return null;

        const quarterlyParent = await ctx.db.get(
          weeklyParent?.parentId as Id<'goals'>
        );
        if (!quarterlyParent || quarterlyParent.userId !== userId) return null;

        // Get the quarterly goal's weekly state for starred/pinned status
        const quarterlyGoalWeekly = await ctx.db
          .query('goalStateByWeek')
          .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
            q
              .eq('userId', userId)
              .eq('year', from.year)
              .eq('quarter', from.quarter)
              .eq('weekNumber', from.weekNumber)
          )
          .filter((q) => q.eq(q.field('goalId'), quarterlyParent?._id))
          .first();

        return {
          weeklyGoalState: weeklyGoal,
          details: {
            id: weeklyGoal._id,
            title: dailyGoal?.title ?? '',
            details: dailyGoal?.details,
            weeklyGoal: {
              id: weeklyParent?._id ?? '',
              title: weeklyParent?.title ?? '',
            },
            quarterlyGoal: {
              id: quarterlyParent?._id ?? '',
              title: quarterlyParent?.title ?? '',
              isStarred: quarterlyGoalWeekly?.isStarred ?? false,
              isPinned: quarterlyGoalWeekly?.isPinned ?? false,
            },
          },
        };
      })
    );

    // Filter out any null values
    const validTasks = tasksWithFullDetails.filter(
      (task): task is NonNullable<typeof task> => task !== null
    );

    // === STAGE 2: Take Action (Preview or Update) ===

    // If this is a dry run, return the preview data
    if (dryRun) {
      return {
        canMove: true as const,
        sourceDay: {
          name: getDayName(from.dayOfWeek),
          ...from,
        },
        targetDay: {
          name: getDayName(to.dayOfWeek),
          ...to,
        },
        tasks: validTasks.map((task) => task.details),
      };
    }

    // Not a dry run, perform the actual updates
    // Check if we're moving within the same week
    const isSameWeek =
      from.year === to.year &&
      from.quarter === to.quarter &&
      from.weekNumber === to.weekNumber;

    if (isSameWeek) {
      // Moving within the same week, just update the day
      await Promise.all(
        validTasks.map(async (task) => {
          await ctx.db.patch(task.weeklyGoalState._id, {
            daily: {
              ...task.weeklyGoalState.daily,
              dayOfWeek: to.dayOfWeek,
            },
          });
        })
      );
    } else {
      // Moving to a different week, need to update both weekNumber and dayOfWeek
      await Promise.all(
        validTasks.map(async (task) => {
          await ctx.db.patch(task.weeklyGoalState._id, {
            year: to.year,
            quarter: to.quarter,
            weekNumber: to.weekNumber,
            daily: {
              ...task.weeklyGoalState.daily,
              dayOfWeek: to.dayOfWeek,
            },
          });
        })
      );
    }

    return { tasksMoved: validTasks.length };
  },
});

// migration from goalsWeekly to goalStateByWeek
export const migrateGoals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const goalsWeekly = await ctx.db.query('goalsWeekly').collect();
    const groupedByUser = goalsWeekly.reduce((acc, goalWeekly) => {
      acc[goalWeekly.userId] = acc[goalWeekly.userId] || [];
      acc[goalWeekly.userId].push(goalWeekly);
      return acc;
    }, {} as Record<Id<'users'>, Doc<'goalsWeekly'>[]>);

    const userIds = Object.keys(groupedByUser) as Id<'users'>[];

    // Define types for our statistics
    type UserMigrationResult = {
      userId: Id<'users'>;
      recordsDeleted: number;
      recordsMigrated: number;
      durationMs: number;
      weekBreakdown: Record<string, number>;
      success: boolean;
    };

    type MigrationSummary = {
      totalUsers: number;
      totalRecordsDeleted: number;
      totalRecordsMigrated: number;
      usersProcessed: number;
      totalGoalsWeeklyRecords: number;
    };

    // Run migrations for all users and collect results
    const userResults = await Promise.all(
      userIds.map(async (userId) => {
        const result = (await ctx.runMutation(
          internal.goal.migrateGoalsForUser,
          { userId }
        )) as UserMigrationResult;
        return result;
      })
    );

    // Compile overall statistics
    const totalStats = userResults.reduce(
      (
        acc: {
          totalUsers: number;
          totalRecordsDeleted: number;
          totalRecordsMigrated: number;
        },
        userResult: UserMigrationResult
      ) => {
        acc.totalUsers++;
        acc.totalRecordsDeleted += userResult.recordsDeleted;
        acc.totalRecordsMigrated += userResult.recordsMigrated;
        return acc;
      },
      { totalUsers: 0, totalRecordsDeleted: 0, totalRecordsMigrated: 0 }
    );

    // Return detailed statistics
    return {
      summary: {
        ...totalStats,
        usersProcessed: userIds.length,
        totalGoalsWeeklyRecords: goalsWeekly.length,
      } as MigrationSummary,
      userDetails: userResults,
    };
  },
});

export const migrateGoalsForUser = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Track migration start time
    const startTime = Date.now();

    // // Get existing records in goalStateByWeek for this user
    // const userGoalStates = await ctx.db
    //   .query('goalStateByWeek')
    //   .withIndex('by_user', (q) => q.eq('userId', args.userId))
    //   .collect();

    // // Delete existing records
    // await Promise.all(
    //   userGoalStates.map((goalState) => ctx.db.delete(goalState._id))
    // );

    // const recordsDeleted = userGoalStates.length;

    // Get records from old table
    const oldState = await ctx.db
      .query('goalsWeekly')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Group the old records by some key metrics for stats
    const recordsByWeek = oldState.reduce((acc, record) => {
      const key = `${record.year}-Q${record.quarter}-W${record.weekNumber}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Insert new records
    const insertionResults = await Promise.all(
      oldState.map((goalWeekly) => {
        const { _id, _creationTime, ...copyData } = goalWeekly;
        return ctx.db.insert('goalStateByWeek', copyData);
      })
    );

    const recordsMigrated = insertionResults.length;

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Return detailed statistics
    return {
      userId: args.userId,
      recordsDeleted: 0,
      recordsMigrated,
      durationMs,
      weekBreakdown: recordsByWeek,
      success: recordsMigrated === oldState.length,
    };
  },
});
