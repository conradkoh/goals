import { v } from 'convex/values';
import { mutation, MutationCtx } from '../../../convex/_generated/server';
import { requireLogin } from '../requireLogin';
import { Id, Doc } from '../../../convex/_generated/dataModel';
import {
  QuarterlyGoalToUpdate,
  WeeklyGoalToCopy,
  DailyGoalToMove,
  GoalDepth,
  ProcessGoalResult,
} from './types';

// Type representing a time period with year, quarter, and week number
export type TimePeriod = {
  year: number; // The year of the time period
  quarter: number; // The quarter of the time period
  weekNumber: number; // The week number of the time period
};

export type BaseGoalMoveResult = {
  weeklyGoalsToCopy: {
    title: string;
    carryOver: {
      type: 'week';
      numWeeks: number;
      fromGoal: Id<'goals'>;
    };
    dailyGoalsCount: number;
  }[];
  dailyGoalsToMove: {
    title: string;
    weeklyGoalTitle: string;
  }[];
  quarterlyGoalsToUpdate: {
    title: string;
    isStarred: boolean;
    isPinned: boolean;
  }[];
};

export type DryRunResult = BaseGoalMoveResult & {
  isDryRun: true;
  canPull: true;
};

export type UpdateResult = BaseGoalMoveResult & {
  weeklyGoalsCopied: number;
  dailyGoalsMoved: number;
  quarterlyGoalsUpdated: number;
};

// Input types with discriminated union
export type MoveGoalsFromWeekArgs =
  | {
      userId: Id<'users'>;
      from: TimePeriod;
      to: TimePeriod;
      dryRun: true;
    }
  | {
      userId: Id<'users'>;
      from: TimePeriod;
      to: TimePeriod;
      dryRun: false;
    };

// Helper type to determine return type based on dryRun
type MoveGoalsFromWeekResult<T extends MoveGoalsFromWeekArgs> =
  T['dryRun'] extends true ? DryRunResult : UpdateResult;

/**
 * Move goals from one week to another
 * @param ctx - The database context
 * @param args - The arguments for the mutation
 * @returns The result of the mutation
 */
export async function moveGoalsFromWeekUsecase<T extends MoveGoalsFromWeekArgs>(
  ctx: MutationCtx,
  args: T
): Promise<MoveGoalsFromWeekResult<T>> {
  const { userId, from, to, dryRun } = args;
  const previousWeekGoals = await getGoalsForWeek(ctx, userId, from);

  const result: ProcessGoalResult = {
    weeklyGoalsToCopy: [],
    dailyGoalsToMove: [],
    quarterlyGoalsToUpdate: [],
  };

  // Process each goal from the previous week in parallel
  await Promise.all(
    previousWeekGoals.map(async (weeklyState) => {
      const goal = await ctx.db.get(weeklyState.goalId);
      if (!goal) return; // Skip if goal does not exist

      const processedGoal = await processGoal(
        ctx,
        userId,
        goal,
        weeklyState,
        from
      );
      result.weeklyGoalsToCopy.push(...processedGoal.weeklyGoalsToCopy);
      result.dailyGoalsToMove.push(...processedGoal.dailyGoalsToMove);
      result.quarterlyGoalsToUpdate.push(
        ...processedGoal.quarterlyGoalsToUpdate
      );
    })
  );

  // If this is a dry run, return the preview data
  if (dryRun) {
    return (await generateDryRunPreview(
      ctx,
      result.weeklyGoalsToCopy,
      result.dailyGoalsToMove,
      result.quarterlyGoalsToUpdate
    )) as MoveGoalsFromWeekResult<T>;
  }

  // Perform the actual updates
  await updateQuarterlyGoals(ctx, userId, result.quarterlyGoalsToUpdate, to);
  const copiedWeeklyGoals = await copyWeeklyGoals(
    ctx,
    userId,
    result.weeklyGoalsToCopy,
    to
  );
  await moveDailyGoals(ctx, result.dailyGoalsToMove, to);

  // Generate the preview data for the commit case
  const previewData = await generateDryRunPreview(
    ctx,
    result.weeklyGoalsToCopy,
    result.dailyGoalsToMove,
    result.quarterlyGoalsToUpdate
  );

  return {
    ...previewData,
    weeklyGoalsCopied: copiedWeeklyGoals.length,
    dailyGoalsMoved: result.dailyGoalsToMove.length,
    quarterlyGoalsUpdated: result.quarterlyGoalsToUpdate.length,
  } as MoveGoalsFromWeekResult<T>;
}

/**
 * Get all goals for a given week
 * 1. Get all goals for the week
 * 2. Get the daily goals for each goal
 * 3. Get the weekly state for each goal
 * @param ctx - The database context
 * @param userId - The user ID
 * @param period - The time period (year, quarter, week number)
 * @returns An array of goals for the given week
 */
export async function getGoalsForWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  period: TimePeriod
) {
  return await ctx.db
    .query('goalsWeekly')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q
        .eq('userId', userId)
        .eq('year', period.year)
        .eq('quarter', period.quarter)
        .eq('weekNumber', period.weekNumber)
    )
    .collect();
}

/**
 * Get all goals for a given parent goal
 * @param ctx - The database context
 * @param userId - The user ID
 * @param parentGoal - The parent goal
 */
async function getChildGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  parentGoal: Doc<'goals'>
) {
  return await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q
        .eq('userId', userId)
        .eq('year', parentGoal.year)
        .eq('quarter', parentGoal.quarter)
    )
    .filter((q) => q.eq(q.field('parentId'), parentGoal._id))
    .collect();
}

async function getDailyGoalState(
  ctx: MutationCtx,
  userId: Id<'users'>,
  period: TimePeriod,
  goalId: Id<'goals'>
) {
  return await ctx.db
    .query('goalsWeekly')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q
        .eq('userId', userId)
        .eq('year', period.year)
        .eq('quarter', period.quarter)
        .eq('weekNumber', period.weekNumber)
    )
    .filter((q) => q.eq(q.field('goalId'), goalId))
    .first();
}

async function processQuarterlyGoal(
  ctx: MutationCtx,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalsWeekly'>
): Promise<QuarterlyGoalToUpdate[]> {
  if (weeklyState.isStarred || weeklyState.isPinned) {
    return [
      {
        goalId: goal._id,
        isStarred: weeklyState.isStarred,
        isPinned: weeklyState.isPinned,
      },
    ];
  }
  return [];
}

async function processWeeklyGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalsWeekly'>,
  from: TimePeriod
): Promise<{ weeklyGoals: WeeklyGoalToCopy[]; dailyGoals: DailyGoalToMove[] }> {
  if (goal.depth !== GoalDepth.Weekly) {
    throw new Error(
      `processWeeklyGoal called on non-weekly goal: ${goal._id} (${goal.title})`
    );
  }

  const dailyGoals = await getChildGoals(ctx, userId, goal);

  const hasIncompleteDailyGoals = await dailyGoals.some(
    async (dailyGoal: Doc<'goals'>) => {
      const dailyState = await getDailyGoalState(
        ctx,
        userId,
        from,
        dailyGoal._id
      );
      return !dailyState?.isComplete;
    }
  );

  if (!weeklyState.isComplete || hasIncompleteDailyGoals) {
    const weeklyGoalToCopy: WeeklyGoalToCopy = {
      originalGoal: goal,
      weeklyState,
      carryOver: {
        type: 'week',
        numWeeks: (weeklyState.carryOver?.numWeeks ?? 0) + 1,
        fromGoal: goal._id,
      },
    };

    const dailyGoalsToMove: DailyGoalToMove[] = [];
    for (const dailyGoal of dailyGoals) {
      const dailyState = await getDailyGoalState(
        ctx,
        userId,
        from,
        dailyGoal._id
      );
      if (dailyState && !dailyState.isComplete) {
        dailyGoalsToMove.push({
          goal: dailyGoal,
          weeklyState: dailyState,
          parentWeeklyGoal: goal,
        });
      }
    }

    return {
      weeklyGoals: [weeklyGoalToCopy],
      dailyGoals: dailyGoalsToMove,
    };
  }

  return { weeklyGoals: [], dailyGoals: [] };
}

export async function processGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalsWeekly'>,
  from: TimePeriod
): Promise<ProcessGoalResult> {
  const result: ProcessGoalResult = {
    weeklyGoalsToCopy: [],
    dailyGoalsToMove: [],
    quarterlyGoalsToUpdate: [],
  };

  switch (goal.depth) {
    case GoalDepth.Quarterly: {
      result.quarterlyGoalsToUpdate = await processQuarterlyGoal(
        ctx,
        goal,
        weeklyState
      );
      break;
    }
    case GoalDepth.Weekly: {
      const { weeklyGoals, dailyGoals } = await processWeeklyGoal(
        ctx,
        userId,
        goal,
        weeklyState,
        from
      );
      result.weeklyGoalsToCopy = weeklyGoals;
      result.dailyGoalsToMove = dailyGoals;
      break;
    }
    // Daily goals are processed as part of weekly goals
    case GoalDepth.Daily:
    default:
      break;
  }

  return result;
}

export async function generateDryRunPreview(
  ctx: MutationCtx,
  weeklyGoalsToCopy: WeeklyGoalToCopy[],
  dailyGoalsToMove: DailyGoalToMove[],
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[]
): Promise<DryRunResult> {
  return {
    isDryRun: true,
    canPull: true,
    weeklyGoalsToCopy: weeklyGoalsToCopy.map((item) => ({
      title: item.originalGoal.title,
      carryOver: item.carryOver,
      dailyGoalsCount: dailyGoalsToMove.filter(
        (dg) => dg.parentWeeklyGoal._id === item.originalGoal._id
      ).length,
    })),
    dailyGoalsToMove: dailyGoalsToMove.map((item) => ({
      title: item.goal.title,
      weeklyGoalTitle: item.parentWeeklyGoal.title,
    })),
    quarterlyGoalsToUpdate: await Promise.all(
      quarterlyGoalsToUpdate.map(async (item) => {
        const goal = await ctx.db.get(item.goalId);
        return {
          title: goal?.title ?? '',
          isStarred: item.isStarred,
          isPinned: item.isPinned,
        };
      })
    ),
  };
}

export async function updateQuarterlyGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[],
  to: TimePeriod
) {
  await Promise.all(
    quarterlyGoalsToUpdate.map(async (item) => {
      const existingState = await getDailyGoalState(
        ctx,
        userId,
        to,
        item.goalId
      );
      if (existingState) {
        await ctx.db.patch(existingState._id, {
          isStarred: item.isStarred,
          isPinned: item.isPinned,
        });
      }
    })
  );
}

export async function copyWeeklyGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  weeklyGoalsToCopy: WeeklyGoalToCopy[],
  to: TimePeriod
) {
  return await Promise.all(
    weeklyGoalsToCopy.map(async (item) => {
      const { _id, _creationTime, ...goalData } = item.originalGoal;
      const newGoalId = await ctx.db.insert('goals', {
        ...goalData,
        carryOver: item.carryOver,
      });

      await ctx.db.insert('goalsWeekly', {
        userId,
        year: to.year,
        quarter: to.quarter,
        weekNumber: to.weekNumber,
        goalId: newGoalId,
        progress: '',
        isStarred: false,
        isPinned: false,
        isComplete: false,
        carryOver: item.carryOver,
      });

      return newGoalId;
    })
  );
}

export async function moveDailyGoals(
  ctx: MutationCtx,
  dailyGoalsToMove: DailyGoalToMove[],
  to: TimePeriod
) {
  await Promise.all(
    dailyGoalsToMove.map(async (item) => {
      await ctx.db.patch(item.weeklyState._id, {
        weekNumber: to.weekNumber,
      });
    })
  );
}
