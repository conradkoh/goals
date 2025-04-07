import { Doc, Id } from '../../../convex/_generated/dataModel';
import { MutationCtx } from '../../../convex/_generated/server';
import { requireLogin } from '../requireLogin';
import {
  CarryOver,
  DailyGoalToMove,
  DryRunResult,
  GoalDepth,
  MoveGoalsFromWeekArgs,
  MoveGoalsFromWeekResult,
  ProcessGoalResult,
  QuarterlyGoalToUpdate,
  TargetWeekContext,
  TimePeriod,
  WeeklyGoalWithState,
  WeekStateToCopy,
} from './types';

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

  // Pre-fetch all required data
  const previousWeekGoals = await getGoalsForWeek(ctx, userId, from);

  // Pre-fetch all goal documents using Promise.all instead of getAll
  const goalIds = previousWeekGoals.map((state) => state.goalId);
  const goalPromises = goalIds.map((id) => ctx.db.get(id));
  const goals = await Promise.all(goalPromises);

  // Create a map for quick access
  const goalsMap = new Map<Id<'goals'>, Doc<'goals'>>();
  const weeklyGoals: Doc<'goals'>[] = [];

  goals.forEach((goal) => {
    if (goal) {
      goalsMap.set(goal._id, goal);
      if (goal.depth === GoalDepth.Weekly) {
        weeklyGoals.push(goal);
      }
    }
  });

  // Pre-fetch all child goals for weekly goals in a single batch
  const childGoalsMap = await getBatchChildGoals(
    ctx,
    userId,
    weeklyGoals,
    from.year,
    from.quarter
  );

  // Pre-fetch parent goals (quarterly goals) for weekly goals
  const parentIds = goals
    .filter((goal) => goal?.parentId)
    .map((goal) => goal!.parentId!);
  const uniqueParentIds = [...new Set(parentIds)];
  const parentGoalPromises = uniqueParentIds.map((id) => ctx.db.get(id));
  const parentGoals = await Promise.all(parentGoalPromises);

  // Create a map of parent goals
  const parentGoalsMap = new Map<Id<'goals'>, Doc<'goals'>>();
  parentGoals.forEach((goal) => {
    if (goal) {
      parentGoalsMap.set(goal._id, goal);
    }
  });

  const result: ProcessGoalResult = {
    quarterlyGoalsToUpdate: [],
    dailyGoalsToMove: [],
    weekStatesToCopy: [],
  };

  // Process each goal from the previous week in parallel
  await Promise.all(
    previousWeekGoals.map(async (weeklyState) => {
      const goal = goalsMap.get(weeklyState.goalId);
      if (!goal) return; // Skip if goal does not exist

      const processedGoal = await processGoal(
        ctx,
        userId,
        goal,
        weeklyState,
        from,
        parentGoalsMap,
        childGoalsMap
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

  // Pre-fetch goals for the target week to avoid repeated queries
  const targetWeekGoals = await getGoalsForWeek(ctx, userId, to);

  // Perform the actual updates
  const copiedWeekStates = await copyWeeklyGoals(
    ctx,
    result.weekStatesToCopy.map((item) => ({
      goal: item.originalGoal,
      state: item.weekState,
      dailyGoals: item.dailyGoalsToMove,
    })),
    {
      userId,
      year: to.year,
      quarter: to.quarter,
      weekNumber: to.weekNumber,
      dayOfWeek: to.dayOfWeek,
      existingGoals: targetWeekGoals,
    }
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
 * @param year - The year
 * @param quarter - The quarter
 * @returns An array of child goals
 */
async function getChildGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  parentGoal: Doc<'goals'>,
  year: number,
  quarter: number
) {
  return await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
    )
    .filter((q) => q.eq(q.field('parentId'), parentGoal._id))
    .collect();
}

/**
 * Get all child goals for a batch of parent goals
 * @param ctx - The database context
 * @param userId - The user ID
 * @param parentGoals - Array of parent goals
 * @param year - The year
 * @param quarter - The quarter
 * @returns A map of parent goal IDs to their child goals
 */
async function getBatchChildGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  parentGoals: Doc<'goals'>[],
  year: number,
  quarter: number
) {
  const childGoalsMap = new Map<Id<'goals'>, Doc<'goals'>[]>();

  // Get all child goals in parallel
  await Promise.all(
    parentGoals.map(async (parentGoal) => {
      const childGoals = await getChildGoals(
        ctx,
        userId,
        parentGoal,
        year,
        quarter
      );
      childGoalsMap.set(parentGoal._id, childGoals);
    })
  );

  return childGoalsMap;
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

    if (weeklyGoalItems.length === 0) {
      return [];
    }

    // Get all states for these weekly goals in a single query
    const weeklyStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', goal.userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('weekNumber', weeklyState.weekNumber)
      )
      .filter((q) =>
        q.or(
          ...weeklyGoalItems.map((weeklyGoal) =>
            q.eq(q.field('goalId'), weeklyGoal._id)
          )
        )
      )
      .collect();

    // Check if any weekly goals are incomplete using the fetched states
    const hasIncompleteWeeklyGoals = weeklyGoalItems.some((weeklyGoal) => {
      const state = weeklyStates.find((s) => s.goalId === weeklyGoal._id);
      return !state?.isComplete;
    });

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
  from: TimePeriod,
  parentGoalsMap?: Map<Id<'goals'>, Doc<'goals'>>,
  childGoalsMap?: Map<Id<'goals'>, Doc<'goals'>[]>
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
      let quarterlyGoal: Doc<'goals'> | null = null;

      // Use pre-fetched parent goal if available
      if (goal.parentId) {
        if (parentGoalsMap && parentGoalsMap.has(goal.parentId)) {
          quarterlyGoal = parentGoalsMap.get(goal.parentId) || null;
        } else {
          quarterlyGoal = await ctx.db.get(goal.parentId);
        }
      }

      const { weeklyGoals, dailyGoals } = await processWeeklyGoal(
        ctx,
        userId,
        goal,
        weeklyState,
        from,
        quarterlyGoal,
        childGoalsMap
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
  quarterlyGoal: Doc<'goals'> | null,
  childGoalsMap?: Map<Id<'goals'>, Doc<'goals'>[]>
): Promise<{ weeklyGoals: WeekStateToCopy[]; dailyGoals: DailyGoalToMove[] }> {
  if (goal.depth !== GoalDepth.Weekly) {
    throw new Error(
      `processWeeklyGoal called on non-weekly goal: ${goal._id} (${goal.title})`
    );
  }

  // Get all daily goals - use pre-fetched data if available
  let dailyGoals: Doc<'goals'>[] = [];
  if (childGoalsMap && childGoalsMap.has(goal._id)) {
    dailyGoals = childGoalsMap.get(goal._id) || [];
  } else {
    dailyGoals = await getChildGoals(
      ctx,
      userId,
      goal,
      from.year,
      from.quarter
    );
  }

  if (dailyGoals.length === 0 && !weeklyState.isComplete) {
    // If there are no daily goals and the weekly goal is incomplete, carry it over
    return createWeeklyGoalCarryOver(goal, weeklyState, quarterlyGoal, []);
  }

  if (dailyGoals.length > 0) {
    // Get all daily goal states in a single query
    const dailyStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', from.weekNumber)
      )
      .filter((q) =>
        q.or(
          ...dailyGoals.map((dailyGoal) =>
            q.eq(q.field('goalId'), dailyGoal._id)
          )
        )
      )
      .collect();

    // Check for incomplete daily goals
    const incompleteDailyGoals = dailyGoals.filter((dailyGoal) => {
      const state = dailyStates.find((s) => s.goalId === dailyGoal._id);
      return !state?.isComplete;
    });

    if (incompleteDailyGoals.length > 0 || !weeklyState.isComplete) {
      // Create daily goals to move
      const dailyGoalsToMove = incompleteDailyGoals.map((dailyGoal) => {
        const dailyState = dailyStates.find((s) => s.goalId === dailyGoal._id);
        if (!dailyState) {
          throw new Error(`State not found for daily goal: ${dailyGoal._id}`);
        }
        return {
          goal: dailyGoal,
          weekState: dailyState,
          parentWeeklyGoal: goal,
          parentQuarterlyGoal: quarterlyGoal ?? undefined,
        };
      });

      return createWeeklyGoalCarryOver(
        goal,
        weeklyState,
        quarterlyGoal,
        dailyGoalsToMove
      );
    }
  }

  return { weeklyGoals: [], dailyGoals: [] };
}

// Helper function to create the weekly goal carry over structure
function createWeeklyGoalCarryOver(
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>,
  quarterlyGoal: Doc<'goals'> | null,
  dailyGoalsToMove: DailyGoalToMove[]
): { weeklyGoals: WeekStateToCopy[]; dailyGoals: DailyGoalToMove[] } {
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
    dailyGoalsToMove,
  };

  return {
    weeklyGoals: [weeklyGoalToCopy],
    dailyGoals: dailyGoalsToMove,
  };
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

/**
 * Copies weekly goals and their associated daily goals to a target week
 * @param ctx - Database context
 * @param goalsToMove - Array of weekly goals and their states to copy
 * @param targetWeek - Context about the target week including existing goals
 * @returns Array of newly created weekly goals
 */
export async function copyWeeklyGoals(
  ctx: MutationCtx,
  goalsToMove: WeeklyGoalWithState[],
  targetWeek: TargetWeekContext
): Promise<Doc<'goals'>[]> {
  if (goalsToMove.length === 0) {
    return [];
  }

  // First, deduplicate goals by creating a map of unique goals with their latest state
  const uniqueGoalsMap = new Map<Id<'goals'>, WeeklyGoalWithState>();

  goalsToMove.forEach((item) => {
    const existingEntry = uniqueGoalsMap.get(item.goal._id);
    if (
      !existingEntry ||
      existingEntry.state._creationTime < item.state._creationTime
    ) {
      uniqueGoalsMap.set(item.goal._id, item);
    }
  });

  // Create all new goals first in a batch, one per unique goal
  const goalInsertions = await Promise.all(
    Array.from(uniqueGoalsMap.values()).map(
      async ({ goal, state, dailyGoals }) => {
        // Create a new carry over object with incremented numWeeks
        const carryOver: CarryOver = {
          type: 'week',
          numWeeks: (state.carryOver?.numWeeks ?? 0) + 1,
          fromGoal: {
            previousGoalId: goal._id,
            rootGoalId: state.carryOver?.fromGoal.rootGoalId ?? goal._id,
          },
        };

        // Extract only the fields we want to copy
        const { _id, _creationTime, ...goalFieldsToCopy } = goal;

        // Check if this goal was already cloned in the target week
        const existingGoalState = targetWeek.existingGoals.find(
          (existingState) =>
            existingState.carryOver?.fromGoal.rootGoalId === goal._id
        );

        if (existingGoalState) {
          // Goal already exists, return its ID
          return {
            goal,
            targetWeekGoalId: existingGoalState.goalId,
            carryOver,
            isNew: false,
            dailyGoals,
          };
        } else {
          // Create new goal with carry over information
          const newGoalId = await ctx.db.insert('goals', {
            ...goalFieldsToCopy,
            carryOver,
            parentId: goal.parentId,
            inPath: goal.parentId ? `/${goal.parentId}` : '/',
            isComplete: false,
          });

          return {
            goal,
            targetWeekGoalId: newGoalId,
            carryOver,
            isNew: true,
            dailyGoals,
          };
        }
      }
    )
  );

  // Create all weekly states in a batch, one per unique goal
  const stateInsertions = await Promise.all(
    goalInsertions.map(
      async ({ goal, targetWeekGoalId, carryOver, dailyGoals }) => {
        // Create weekly state that points to the new goal
        const newWeeklyStateId = await ctx.db.insert('goalStateByWeek', {
          userId: targetWeek.userId,
          year: targetWeek.year,
          quarter: targetWeek.quarter,
          weekNumber: targetWeek.weekNumber,
          goalId: targetWeekGoalId,
          isStarred: false,
          isPinned: false,
          isComplete: false,
          carryOver,
        });

        return {
          goal,
          targetWeekGoalId,
          newWeeklyStateId,
          dailyGoals,
        };
      }
    )
  );

  // Fetch all the created goals and states at once
  const allGoalIds = goalInsertions.map((item) => item.targetWeekGoalId);
  const allStateIds = stateInsertions.map((item) => item.newWeeklyStateId);

  // Batch fetch all the newly created entities
  const [allGoals, allStates] = await Promise.all([
    Promise.all(allGoalIds.map((id) => ctx.db.get(id))),
    Promise.all(allStateIds.map((id) => ctx.db.get(id))),
  ]);

  // Create a map for efficient lookup
  const goalsMap = new Map<Id<'goals'>, Doc<'goals'>>();

  allGoals.forEach((goal) => {
    if (goal) goalsMap.set(goal._id, goal);
  });

  // Process daily goals migrations in parallel for each weekly goal
  await Promise.all(
    stateInsertions.map(async ({ targetWeekGoalId, dailyGoals }) => {
      const weeklyGoal = goalsMap.get(targetWeekGoalId);
      if (weeklyGoal) {
        await migrateDailyGoals(ctx, dailyGoals, weeklyGoal, targetWeek);
      }
    })
  );

  // Return the created weekly goals
  return allGoals.filter(Boolean) as Doc<'goals'>[];
}

export async function migrateDailyGoals(
  ctx: MutationCtx,
  dailyGoalsToMove: DailyGoalToMove[],
  toWeeklyGoal: Doc<'goals'>,
  targetWeek: TargetWeekContext
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

      // Delete the goal state from the previous week
      await ctx.db.delete(dailyGoal.weekState._id);

      // Create a new goal state in the target week
      await ctx.db.insert('goalStateByWeek', {
        userId: targetWeek.userId,
        year: targetWeek.year,
        quarter: targetWeek.quarter,
        weekNumber: targetWeek.weekNumber,
        goalId: dailyGoal.goal._id,
        isStarred: false,
        isPinned: false,
        isComplete: false,
        daily:
          targetWeek.dayOfWeek !== undefined
            ? {
                ...dailyGoal.weekState.daily,
                dayOfWeek: targetWeek.dayOfWeek,
              }
            : dailyGoal.weekState.daily,
      });
    })
  );
}
