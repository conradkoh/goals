import { v } from 'convex/values';
import { mutation, MutationCtx } from '../../../convex/_generated/server';
import { requireLogin } from '../requireLogin';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  QuarterlyGoalToUpdate,
  ProcessGoalResult,
  GoalDepth,
  DailyGoalToMove,
  CarryOver,
  WeekStateToCopy,
} from './types';
import { DateTime } from 'luxon';
import { DayOfWeek } from '../../../src/constants';

// Type representing a time period with year, quarter, and week number
export type TimePeriod = {
  year: number; // The year of the time period
  quarter: number; // The quarter of the time period
  weekNumber: number; // The week number of the time period
  dayOfWeek?: DayOfWeek; // Optional day of week to consolidate daily goals to (1-7, where 1 is Monday)
};

export type BaseGoalMoveResult = {
  weekStatesToCopy: {
    title: string;
    carryOver: {
      type: 'week';
      numWeeks: number;
      fromGoal: {
        previousGoalId: Id<'goals'>;
        rootGoalId: Id<'goals'>;
      };
    };
    dailyGoalsCount: number;
    quarterlyGoalId?: Id<'goals'>;
  }[];
  dailyGoalsToMove: {
    id: Id<'goals'>;
    title: string;
    weeklyGoalId: Id<'goals'>;
    weeklyGoalTitle: string;
    quarterlyGoalId?: Id<'goals'>;
    quarterlyGoalTitle?: string;
  }[];
  quarterlyGoalsToUpdate: {
    id: Id<'goals'>;
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
  weekStatesCopied: number;
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
    quarterlyGoalsToUpdate: [],
    dailyGoalsToMove: [],
    weekStatesToCopy: [],
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
      result.weekStatesToCopy.push(...processedGoal.weekStatesToCopy);
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
      result.weekStatesToCopy,
      result.dailyGoalsToMove,
      result.quarterlyGoalsToUpdate
    )) as MoveGoalsFromWeekResult<T>;
  }

  // Perform the actual updates
  const copiedWeekStates = await copyWeeklyGoals(
    ctx,
    userId,
    result.weekStatesToCopy,
    to
  );

  // Update quarterly goals with their starred/pinned states
  await updateQuarterlyGoals(ctx, userId, result.quarterlyGoalsToUpdate, to);

  // Generate the preview data for the commit case
  const previewData = await generateDryRunPreview(
    ctx,
    result.weekStatesToCopy,
    result.dailyGoalsToMove,
    result.quarterlyGoalsToUpdate
  );

  return {
    weekStatesToCopy: previewData.weekStatesToCopy,
    dailyGoalsToMove: previewData.dailyGoalsToMove,
    quarterlyGoalsToUpdate: previewData.quarterlyGoalsToUpdate,
    weekStatesCopied: copiedWeekStates.length,
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
    .query('goalStateByWeek')
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
    .query('goalStateByWeek')
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
  weeklyState: Doc<'goalStateByWeek'>
): Promise<QuarterlyGoalToUpdate[]> {
  if (weeklyState.isStarred || weeklyState.isPinned) {
    // Get all weekly goals under this quarterly goal
    const weeklyGoalItems = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q
          .eq('userId', goal.userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
      )
      .filter((q) => q.eq(q.field('parentId'), goal._id))
      .collect();

    // Check if any weekly goals are incomplete
    const hasIncompleteWeeklyGoals = await Promise.all(
      weeklyGoalItems.map(async (weeklyGoal) => {
        const state = await ctx.db
          .query('goalStateByWeek')
          .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
            q
              .eq('userId', goal.userId)
              .eq('year', goal.year)
              .eq('quarter', goal.quarter)
              .eq('weekNumber', weeklyState.weekNumber)
          )
          .filter((q) => q.eq(q.field('goalId'), weeklyGoal._id))
          .first();
        return !state?.isComplete;
      })
    ).then((results) => results.some((isIncomplete) => isIncomplete));

    // Only update if there are incomplete weekly goals
    if (hasIncompleteWeeklyGoals) {
      return [
        {
          goalId: goal._id,
          title: goal.title,
          isStarred: weeklyState.isStarred,
          isPinned: weeklyState.isStarred ? false : weeklyState.isPinned,
        },
      ];
    }
  }
  return [];
}

export async function processGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>,
  from: TimePeriod
): Promise<ProcessGoalResult> {
  const result: ProcessGoalResult = {
    quarterlyGoalsToUpdate: [],
    dailyGoalsToMove: [],
    weekStatesToCopy: [],
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
      const quarterlyGoal = goal.parentId
        ? await ctx.db.get(goal.parentId)
        : null;
      const { weeklyGoals, dailyGoals } = await processWeeklyGoal(
        ctx,
        userId,
        goal,
        weeklyState,
        from,
        quarterlyGoal
      );
      result.weekStatesToCopy = weeklyGoals;
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

export async function processWeeklyGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>,
  from: TimePeriod,
  quarterlyGoal: Doc<'goals'> | null
): Promise<{ weeklyGoals: WeekStateToCopy[]; dailyGoals: DailyGoalToMove[] }> {
  if (goal.depth !== GoalDepth.Weekly) {
    throw new Error(
      `processWeeklyGoal called on non-weekly goal: ${goal._id} (${goal.title})`
    );
  }

  const dailyGoals = await getChildGoals(ctx, userId, goal);

  // If the weekly goal is incomplete and has no daily goals, or if it has incomplete daily goals,
  // we should carry it over
  const hasIncompleteDailyGoals =
    dailyGoals.length > 0 &&
    (await Promise.all(
      dailyGoals.map(async (dailyGoal: Doc<'goals'>) => {
        const dailyState = await getDailyGoalState(
          ctx,
          userId,
          from,
          dailyGoal._id
        );
        return !dailyState?.isComplete;
      })
    ).then((results) => results.some((isIncomplete) => isIncomplete)));

  if (
    !weeklyState.isComplete ||
    (dailyGoals.length === 0 && !weeklyState.isComplete) ||
    hasIncompleteDailyGoals
  ) {
    // For carry over:
    // - If the goal was not previously carried over (carryOver undefined), both rootGoalId and previousGoalId should be the current goal's ID
    // - If the goal was carried over, preserve the rootGoalId from the previous carry over, and set previousGoalId to the current goal's ID
    const rootGoalId = weeklyState.carryOver?.fromGoal.rootGoalId ?? goal._id;

    const weeklyGoalToCopy: WeekStateToCopy = {
      originalGoal: goal,
      weekState: weeklyState,
      carryOver: {
        type: 'week',
        numWeeks: (weeklyState.carryOver?.numWeeks ?? 0) + 1,
        fromGoal: {
          previousGoalId: goal._id,
          rootGoalId: rootGoalId,
        },
      },
      quarterlyGoalId: quarterlyGoal?._id,
      dailyGoalsToMove: [],
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
        const dailyGoalToMove: DailyGoalToMove = {
          goal: dailyGoal,
          weekState: dailyState,
          parentWeeklyGoal: goal,
          parentQuarterlyGoal: quarterlyGoal ?? undefined,
        };
        dailyGoalsToMove.push(dailyGoalToMove);
        weeklyGoalToCopy.dailyGoalsToMove.push(dailyGoalToMove);
      }
    }

    return {
      weeklyGoals: [weeklyGoalToCopy],
      dailyGoals: dailyGoalsToMove,
    };
  }

  return { weeklyGoals: [], dailyGoals: [] };
}

export async function generateDryRunPreview(
  ctx: MutationCtx,
  weekStatesToCopy: WeekStateToCopy[],
  dailyGoalsToMove: DailyGoalToMove[],
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[]
): Promise<DryRunResult> {
  return {
    isDryRun: true,
    canPull: true,
    weekStatesToCopy: weekStatesToCopy.map((item) => ({
      title: item.originalGoal.title,
      carryOver: item.carryOver,
      dailyGoalsCount: item.dailyGoalsToMove.length,
      quarterlyGoalId: item.quarterlyGoalId,
    })),
    dailyGoalsToMove: dailyGoalsToMove.map((item) => ({
      id: item.goal._id,
      title: item.goal.title,
      weeklyGoalId: item.parentWeeklyGoal._id,
      weeklyGoalTitle: item.parentWeeklyGoal.title,
      quarterlyGoalId: item.parentQuarterlyGoal?._id,
      quarterlyGoalTitle: item.parentQuarterlyGoal?.title,
    })),
    quarterlyGoalsToUpdate: quarterlyGoalsToUpdate.map((item) => ({
      id: item.goalId,
      title: item.title,
      isStarred: item.isStarred,
      isPinned: item.isPinned,
    })),
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

      // Determine final state based on existing state and source state
      let newState;
      if (existingState) {
        // Prioritize existing starred state over pinned state from source
        if (existingState.isStarred) {
          newState = {
            isStarred: true,
            isPinned: false, // Starred goals cannot be pinned
          };
        } else {
          // If not already starred, apply the states from the source
          newState = {
            isStarred: item.isStarred,
            isPinned: item.isPinned,
          };
        }
        await ctx.db.patch(existingState._id, newState);
      } else {
        // If no existing state, simply apply the states from the source
        newState = {
          isStarred: item.isStarred,
          isPinned: item.isPinned,
        };
        await ctx.db.insert('goalStateByWeek', {
          userId,
          year: to.year,
          quarter: to.quarter,
          weekNumber: to.weekNumber,
          goalId: item.goalId,
          isComplete: false,
          ...newState,
        });
      }
    })
  );
}

export async function copyWeeklyGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  weekStatesToCopy: WeekStateToCopy[],
  to: TimePeriod
) {
  return await Promise.all(
    weekStatesToCopy.map(async (item) => {
      const { weeklyGoal, weekState } = await copyWeeklyGoal(
        ctx,
        userId,
        item,
        to
      );
      await migrateDailyGoals(ctx, item.dailyGoalsToMove, weeklyGoal, to);
      return weeklyGoal;
    })
  );
}

export async function copyWeeklyGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  weekStateToCopy: WeekStateToCopy,
  to: TimePeriod
) {
  // Create a new carry over object with incremented numWeeks
  const carryOver: CarryOver = {
    type: 'week',
    numWeeks: (weekStateToCopy.weekState.carryOver?.numWeeks ?? 0) + 1,
    fromGoal: {
      previousGoalId: weekStateToCopy.originalGoal._id,
      rootGoalId:
        weekStateToCopy.weekState.carryOver?.fromGoal.rootGoalId ??
        weekStateToCopy.originalGoal._id,
    },
  };

  // Extract only the fields we want to copy
  const { _id, _creationTime, ...goalFieldsToCopy } =
    weekStateToCopy.originalGoal;

  // Check if this goal was already cloned based on the carry over information
  const goalsForTargetWeek = await getGoalsForWeek(ctx, userId, to);
  let targetWeekGoalId = goalsForTargetWeek.find(
    (goal) =>
      goal.carryOver?.fromGoal.rootGoalId === weekStateToCopy.originalGoal._id
  )?.goalId;

  if (!targetWeekGoalId) {
    // Create new goal with carry over information
    targetWeekGoalId = await ctx.db.insert('goals', {
      ...goalFieldsToCopy,
      carryOver,
      parentId: weekStateToCopy.quarterlyGoalId,
      inPath: weekStateToCopy.quarterlyGoalId
        ? `/${weekStateToCopy.quarterlyGoalId}`
        : '/',
    });
  }

  // Create weekly state that points to the new goal
  const newWeeklyStateId = await ctx.db.insert('goalStateByWeek', {
    userId,
    year: to.year,
    quarter: to.quarter,
    weekNumber: to.weekNumber,
    goalId: targetWeekGoalId, // Point to the new goal
    isStarred: false,
    isPinned: false,
    isComplete: false,
    carryOver,
  });

  const [weeklyGoal, weeklyState] = await Promise.all([
    ctx.db.get(targetWeekGoalId),
    ctx.db.get(newWeeklyStateId),
  ]);

  if (!weeklyGoal || !weeklyState) {
    throw new Error('Failed to copy weekly goal or weekly state');
  }

  return {
    weeklyGoal,
    weekState: weeklyState,
  };
}

export async function migrateDailyGoals(
  ctx: MutationCtx,
  dailyGoalsToMove: DailyGoalToMove[],
  toWeeklyGoal: Doc<'goals'>,
  to: TimePeriod
) {
  // Update the daily goals to point to the new weekly goal
  await Promise.all(
    dailyGoalsToMove.map(async (dailyGoal) => {
      // Update the daily goal's parent and path
      await ctx.db.patch(dailyGoal.goal._id, {
        parentId: toWeeklyGoal._id,
        inPath: toWeeklyGoal.parentId
          ? `/${toWeeklyGoal.parentId}/${toWeeklyGoal._id}`
          : `/${toWeeklyGoal._id}`,
      });

      // Update the weekly state to point to the original daily goal
      const updateFields: Partial<Doc<'goalStateByWeek'>> = {
        weekNumber: to.weekNumber,
      };

      // If a target day of week is specified, update the day of week for the goal
      if (to.dayOfWeek !== undefined) {
        updateFields.daily = {
          ...dailyGoal.weekState.daily,
          dayOfWeek: to.dayOfWeek,
        };
      }

      await ctx.db.patch(dailyGoal.weekState._id, updateFields);
    })
  );
}
