// fallow-ignore-file code-duplication
import {
  type CarryOver,
  type DailyGoalToMove,
  GoalDepth,
  type HierarchicalDryRunPreview,
  type HierarchicalProcessResult,
  type HierarchicalUpdateResult,
  type QuarterlyGoalToUpdate,
  type TargetWeekContext,
  type TimePeriod,
  type WeeklyGoalWithState,
  type WeekStateToCopy,
} from './types';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/_generated/server';

export type MoveHierarchicalGoalsFromWeekArgs = {
  userId: Id<'users'>;
  from: TimePeriod;
  to: TimePeriod;
  dryRun: boolean;
};

export type MoveHierarchicalGoalsFromWeekResult<T extends MoveHierarchicalGoalsFromWeekArgs> =
  T['dryRun'] extends true ? HierarchicalDryRunPreview : HierarchicalUpdateResult;

/**
 * Cheap existence probe for hierarchical goal states in a week.
 */
export async function hasHierarchicalGoalStatesInWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  period: TimePeriod
): Promise<boolean> {
  const probe = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q
        .eq('userId', userId)
        .eq('year', period.year)
        .eq('quarter', period.quarter)
        .eq('weekNumber', period.weekNumber)
    )
    .first();

  return probe !== null;
}

/**
 * Get all goal states for a given week (quarterly / weekly / daily hierarchy).
 */
export async function getGoalsForWeek(ctx: MutationCtx, userId: Id<'users'>, period: TimePeriod) {
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

async function getChildGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  parentGoal: Doc<'goals'>,
  year: number,
  quarter: number
) {
  return await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', parentGoal._id)
    )
    .collect();
}

async function getBatchChildGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  parentGoals: Doc<'goals'>[],
  year: number,
  quarter: number
) {
  const childGoalsMap = new Map<Id<'goals'>, Doc<'goals'>[]>();

  await Promise.all(
    parentGoals.map(async (parentGoal) => {
      const childGoals = await getChildGoals(ctx, userId, parentGoal, year, quarter);
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

// fallow-ignore-next-line complexity
async function processQuarterlyGoal(
  ctx: MutationCtx,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>
): Promise<QuarterlyGoalToUpdate[]> {
  if (weeklyState.isStarred || weeklyState.isPinned) {
    const weeklyGoalItems = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q
          .eq('userId', goal.userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('parentId', goal._id)
      )
      .collect();

    if (weeklyGoalItems.length === 0) {
      return [];
    }

    const hasIncompleteWeeklyGoals = weeklyGoalItems.some((weeklyGoal) => {
      return !weeklyGoal.isComplete;
    });

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

// fallow-ignore-next-line complexity
async function processGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>,
  from: TimePeriod,
  parentGoalsMap?: Map<Id<'goals'>, Doc<'goals'>>,
  childGoalsMap?: Map<Id<'goals'>, Doc<'goals'>[]>
): Promise<HierarchicalProcessResult> {
  const result: HierarchicalProcessResult = {
    quarterlyGoalsToUpdate: [],
    dailyGoalsToMove: [],
    weekStatesToCopy: [],
  };

  switch (goal.depth) {
    case GoalDepth.Quarterly: {
      result.quarterlyGoalsToUpdate = await processQuarterlyGoal(ctx, goal, weeklyState);
      break;
    }
    case GoalDepth.Weekly: {
      let quarterlyGoal: Doc<'goals'> | null = null;

      if (goal.parentId) {
        if (parentGoalsMap?.has(goal.parentId)) {
          quarterlyGoal = parentGoalsMap.get(goal.parentId) || null;
        } else {
          quarterlyGoal = await ctx.db.get('goals', goal.parentId);
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
    default:
      break;
  }

  return result;
}

// fallow-ignore-next-line complexity
async function processWeeklyGoal(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goal: Doc<'goals'>,
  weeklyState: Doc<'goalStateByWeek'>,
  from: TimePeriod,
  quarterlyGoal: Doc<'goals'> | null,
  childGoalsMap?: Map<Id<'goals'>, Doc<'goals'>[]>
): Promise<{ weeklyGoals: WeekStateToCopy[]; dailyGoals: DailyGoalToMove[] }> {
  if (goal.depth !== GoalDepth.Weekly) {
    throw new Error(`processWeeklyGoal called on non-weekly goal: ${goal._id} (${goal.title})`);
  }

  let dailyGoals: Doc<'goals'>[] = [];
  if (childGoalsMap?.has(goal._id)) {
    dailyGoals = childGoalsMap.get(goal._id) || [];
  } else {
    dailyGoals = await getChildGoals(ctx, userId, goal, from.year, from.quarter);
  }

  if (dailyGoals.length === 0 && !goal.isComplete) {
    return createWeeklyGoalCarryOver(goal, weeklyState, quarterlyGoal, []);
  }

  if (dailyGoals.length > 0) {
    const dailyStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', from.weekNumber)
      )
      .filter((q) => q.or(...dailyGoals.map((dailyGoal) => q.eq(q.field('goalId'), dailyGoal._id))))
      .collect();

    const incompleteDailyGoals = dailyGoals.filter((dailyGoal) => {
      return !dailyGoal.isComplete;
    });

    if (incompleteDailyGoals.length > 0 || !goal.isComplete) {
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

      return createWeeklyGoalCarryOver(goal, weeklyState, quarterlyGoal, dailyGoalsToMove);
    }
  }

  return { weeklyGoals: [], dailyGoals: [] };
}

// fallow-ignore-next-line complexity
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

function generateHierarchicalDryRunPreview(
  plan: HierarchicalProcessResult,
  targetWeekGoals: Doc<'goalStateByWeek'>[]
): HierarchicalDryRunPreview {
  const skippedGoals = plan.weekStatesToCopy
    .filter((item) => {
      const rootGoalId = item.carryOver.fromGoal.rootGoalId;
      return targetWeekGoals.some(
        (existingState) => existingState.carryOver?.fromGoal.rootGoalId === rootGoalId
      );
    })
    .map((item) => ({
      id: item.originalGoal._id,
      title: item.originalGoal.title,
      reason: 'already_moved' as const,
      carryOver: item.carryOver,
      dailyGoalsCount: item.dailyGoalsToMove.length,
      quarterlyGoalId: item.quarterlyGoalId,
    }));

  const goalsToActuallyMove = plan.weekStatesToCopy.filter((item) => {
    const rootGoalId = item.carryOver.fromGoal.rootGoalId;
    return !targetWeekGoals.some(
      (existingState) => existingState.carryOver?.fromGoal.rootGoalId === rootGoalId
    );
  });

  return {
    canPull: goalsToActuallyMove.length > 0 || plan.dailyGoalsToMove.length > 0,
    weekStatesToCopy: goalsToActuallyMove.map((item) => ({
      title: item.originalGoal.title,
      carryOver: item.carryOver,
      dailyGoalsCount: item.dailyGoalsToMove.length,
      quarterlyGoalId: item.quarterlyGoalId,
    })),
    dailyGoalsToMove: plan.dailyGoalsToMove.map((item) => ({
      id: item.goal._id,
      title: item.goal.title,
      weeklyGoalId: item.parentWeeklyGoal._id,
      weeklyGoalTitle: item.parentWeeklyGoal.title,
      quarterlyGoalId: item.parentQuarterlyGoal?._id,
      quarterlyGoalTitle: item.parentQuarterlyGoal?.title,
    })),
    quarterlyGoalsToUpdate: plan.quarterlyGoalsToUpdate.map((item) => ({
      id: item.goalId,
      title: item.title,
      isStarred: item.isStarred,
      isPinned: item.isPinned,
    })),
    skippedGoals,
  };
}

async function updateQuarterlyGoals(
  ctx: MutationCtx,
  userId: Id<'users'>,
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[],
  to: TimePeriod
) {
  await Promise.all(
    quarterlyGoalsToUpdate.map(async (item) => {
      const existingState = await getDailyGoalState(ctx, userId, to, item.goalId);

      let newState: { isStarred: boolean; isPinned: boolean };
      if (existingState) {
        if (existingState.isStarred) {
          newState = {
            isStarred: true,
            isPinned: false,
          };
        } else {
          newState = {
            isStarred: item.isStarred,
            isPinned: item.isPinned,
          };
        }
        await ctx.db.patch('goalStateByWeek', existingState._id, newState);
      } else {
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
          ...newState,
        });
      }
    })
  );
}

// fallow-ignore-next-line complexity
async function copyWeeklyGoals(
  ctx: MutationCtx,
  goalsToMove: WeeklyGoalWithState[],
  targetWeek: TargetWeekContext
): Promise<Doc<'goals'>[]> {
  if (goalsToMove.length === 0) {
    return [];
  }

  const uniqueGoalsMap = new Map<Id<'goals'>, WeeklyGoalWithState>();

  goalsToMove.forEach((item) => {
    const existingEntry = uniqueGoalsMap.get(item.goal._id);
    if (!existingEntry || existingEntry.state._creationTime < item.state._creationTime) {
      uniqueGoalsMap.set(item.goal._id, item);
    }
  });

  const goalInsertions = await Promise.all(
    // fallow-ignore-next-line complexity
    Array.from(uniqueGoalsMap.values()).map(async ({ goal, state, dailyGoals }) => {
      const carryOver: CarryOver = {
        type: 'week',
        numWeeks: (state.carryOver?.numWeeks ?? 0) + 1,
        fromGoal: {
          previousGoalId: goal._id,
          rootGoalId: state.carryOver?.fromGoal.rootGoalId ?? goal._id,
        },
      };

      const { _id, _creationTime, ...goalFieldsToCopy } = goal;

      const rootGoalId = carryOver.fromGoal.rootGoalId;
      const existingGoalState = targetWeek.existingGoals.find(
        (existingState) => existingState.carryOver?.fromGoal.rootGoalId === rootGoalId
      );

      if (existingGoalState) {
        return {
          goal,
          targetWeekGoalId: existingGoalState.goalId,
          carryOver,
          isNew: false,
          dailyGoals,
        };
      }

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
    })
  );

  const stateInsertions = await Promise.all(
    goalInsertions.map(async ({ goal, targetWeekGoalId, carryOver, dailyGoals }) => {
      const newWeeklyStateId = await ctx.db.insert('goalStateByWeek', {
        userId: targetWeek.userId,
        year: targetWeek.year,
        quarter: targetWeek.quarter,
        weekNumber: targetWeek.weekNumber,
        goalId: targetWeekGoalId,
        isStarred: false,
        isPinned: false,
        carryOver,
      });

      return {
        goal,
        targetWeekGoalId,
        newWeeklyStateId,
        dailyGoals,
      };
    })
  );

  const allGoalIds = goalInsertions.map((item) => item.targetWeekGoalId);
  const allGoals = await Promise.all(allGoalIds.map((id) => ctx.db.get('goals', id)));
  const goalsMap = new Map<Id<'goals'>, Doc<'goals'>>();

  allGoals.forEach((goal) => {
    if (goal) goalsMap.set(goal._id, goal);
  });

  await Promise.all(
    stateInsertions.map(async ({ targetWeekGoalId, dailyGoals }) => {
      const weeklyGoal = goalsMap.get(targetWeekGoalId);
      if (weeklyGoal) {
        await migrateDailyGoals(ctx, dailyGoals, weeklyGoal, targetWeek);
      }
    })
  );

  await Promise.all(
    goalInsertions
      .filter(({ isNew }) => isNew)
      .map(async ({ goal, targetWeekGoalId }) => {
        const existingFireGoal = await ctx.db
          .query('fireGoals')
          .withIndex('by_user_and_goal', (q) =>
            q.eq('userId', targetWeek.userId).eq('goalId', goal._id)
          )
          .first();

        if (existingFireGoal) {
          await ctx.db.insert('fireGoals', {
            userId: targetWeek.userId,
            goalId: targetWeekGoalId,
            createdAt: Date.now(),
          });

          await ctx.db.delete('fireGoals', existingFireGoal._id);
        }
      })
  );

  return allGoals.filter(Boolean) as Doc<'goals'>[];
}

async function migrateDailyGoals(
  ctx: MutationCtx,
  dailyGoalsToMove: DailyGoalToMove[],
  toWeeklyGoal: Doc<'goals'>,
  targetWeek: TargetWeekContext
) {
  await Promise.all(
    dailyGoalsToMove.map(async (dailyGoal) => {
      await ctx.db.patch('goals', dailyGoal.goal._id, {
        parentId: toWeeklyGoal._id,
        inPath: toWeeklyGoal.parentId
          ? `/${toWeeklyGoal.parentId}/${toWeeklyGoal._id}`
          : `/${toWeeklyGoal._id}`,
      });

      await ctx.db.delete('goalStateByWeek', dailyGoal.weekState._id);

      const existingDailyState = targetWeek.existingGoals.find(
        (state) =>
          state.goalId === dailyGoal.goal._id &&
          state.year === targetWeek.year &&
          state.quarter === targetWeek.quarter &&
          state.weekNumber === targetWeek.weekNumber
      );

      const nextDaily =
        targetWeek.dayOfWeek !== undefined
          ? {
              ...dailyGoal.weekState.daily,
              dayOfWeek: targetWeek.dayOfWeek,
            }
          : dailyGoal.weekState.daily;

      if (existingDailyState) {
        await ctx.db.patch('goalStateByWeek', existingDailyState._id, {
          daily: nextDaily,
        });
      } else {
        await ctx.db.insert('goalStateByWeek', {
          userId: targetWeek.userId,
          year: targetWeek.year,
          quarter: targetWeek.quarter,
          weekNumber: targetWeek.weekNumber,
          goalId: dailyGoal.goal._id,
          isStarred: false,
          isPinned: false,
          daily: nextDaily,
        });
      }
    })
  );
}

async function buildHierarchicalMovePlan(
  ctx: MutationCtx,
  userId: Id<'users'>,
  from: TimePeriod
): Promise<HierarchicalProcessResult> {
  const previousWeekGoals = await getGoalsForWeek(ctx, userId, from);

  const goalIds = previousWeekGoals.map((state) => state.goalId);
  const goalPromises = goalIds.map((id) => ctx.db.get('goals', id));
  const goals = await Promise.all(goalPromises);

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

  const childGoalsMap = await getBatchChildGoals(ctx, userId, weeklyGoals, from.year, from.quarter);

  const parentIds = goals
    .filter((goal) => goal?.parentId)
    .map((goal) => goal?.parentId)
    .filter((id): id is Id<'goals'> => id !== undefined);
  const uniqueParentIds = [...new Set(parentIds)];
  const parentGoalPromises = uniqueParentIds.map((id) => ctx.db.get('goals', id));
  const parentGoals = await Promise.all(parentGoalPromises);

  const parentGoalsMap = new Map<Id<'goals'>, Doc<'goals'>>();
  parentGoals.forEach((goal) => {
    if (goal) {
      parentGoalsMap.set(goal._id, goal);
    }
  });

  const result: HierarchicalProcessResult = {
    quarterlyGoalsToUpdate: [],
    dailyGoalsToMove: [],
    weekStatesToCopy: [],
  };

  await Promise.all(
    previousWeekGoals.map(async (weeklyState) => {
      const goal = goalsMap.get(weeklyState.goalId);
      if (!goal) return;

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
      result.quarterlyGoalsToUpdate.push(...processedGoal.quarterlyGoalsToUpdate);
    })
  );

  return result;
}

/**
 * Pull incomplete hierarchical goals (quarterly / weekly / daily) from one week into another.
 */
export async function moveHierarchicalGoalsFromWeekUsecase<
  T extends MoveHierarchicalGoalsFromWeekArgs,
>(ctx: MutationCtx, args: T): Promise<MoveHierarchicalGoalsFromWeekResult<T>> {
  const { userId, from, to, dryRun } = args;

  const plan = await buildHierarchicalMovePlan(ctx, userId, from);
  const targetWeekGoals = await getGoalsForWeek(ctx, userId, to);
  const preview = generateHierarchicalDryRunPreview(plan, targetWeekGoals);

  if (dryRun) {
    return preview as MoveHierarchicalGoalsFromWeekResult<T>;
  }

  const copiedWeekStates = await copyWeeklyGoals(
    ctx,
    plan.weekStatesToCopy.map((item) => ({
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

  await updateQuarterlyGoals(ctx, userId, plan.quarterlyGoalsToUpdate, to);

  return {
    ...preview,
    weekStatesCopied: copiedWeekStates.length,
    dailyGoalsMoved: plan.dailyGoalsToMove.length,
    quarterlyGoalsUpdated: plan.quarterlyGoalsToUpdate.length,
  } as MoveHierarchicalGoalsFromWeekResult<T>;
}
