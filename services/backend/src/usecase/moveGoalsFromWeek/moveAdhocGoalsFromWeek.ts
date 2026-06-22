import {
  type AdhocDryRunPreview,
  type AdhocGoalToMove,
  type AdhocProcessResult,
  type AdhocUpdateResult,
  type TimePeriod,
} from './types';
import type { Id } from '../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/_generated/server';
import {
  listIncompleteAdhocGoalsForWeek,
  moveAdhocGoalsToWeek,
} from '../adhocGoals/adhocGoalWeekOps';

export type MoveAdhocGoalsFromWeekArgs = {
  userId: Id<'users'>;
  from: TimePeriod;
  to: TimePeriod;
  dryRun: boolean;
};

export type MoveAdhocGoalsFromWeekResult<T extends MoveAdhocGoalsFromWeekArgs> =
  T['dryRun'] extends true ? AdhocDryRunPreview : AdhocUpdateResult;

/**
 * Cheap existence probe for incomplete adhoc goals in a week.
 */
export async function hasIncompleteAdhocGoalsInWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  period: TimePeriod
): Promise<boolean> {
  const probe = await ctx.db
    .query('goals')
    .withIndex('by_user_and_adhoc_year_week', (q) =>
      q.eq('userId', userId).eq('year', period.year).eq('adhoc.weekNumber', period.weekNumber)
    )
    .filter((q) => q.eq(q.field('isComplete'), false))
    .first();

  return probe !== null;
}

function generateAdhocDryRunPreview(plan: AdhocProcessResult): AdhocDryRunPreview {
  return {
    canPull: plan.adhocGoalsToMove.length > 0,
    adhocGoalsToMove: plan.adhocGoalsToMove.map((item) => ({
      id: item.goal._id,
      title: item.goal.title,
      domainId: item.goal.domainId,
      domainName: item.domain?.name,
      dueDate: item.goal.adhoc?.dueDate,
    })),
  };
}

/**
 * Pull incomplete adhoc goals from one week into another.
 */
export async function moveAdhocGoalsFromWeekUsecase<T extends MoveAdhocGoalsFromWeekArgs>(
  ctx: MutationCtx,
  args: T
): Promise<MoveAdhocGoalsFromWeekResult<T>> {
  const { userId, from, to, dryRun } = args;

  const adhocGoalsToMove: AdhocGoalToMove[] = await listIncompleteAdhocGoalsForWeek(
    ctx,
    userId,
    from
  );

  const plan: AdhocProcessResult = { adhocGoalsToMove };
  const preview = generateAdhocDryRunPreview(plan);

  if (dryRun) {
    return preview as MoveAdhocGoalsFromWeekResult<T>;
  }

  const adhocGoalsMoved = await moveAdhocGoalsToWeek(ctx, userId, adhocGoalsToMove, to);

  return {
    ...preview,
    adhocGoalsMoved,
  } as MoveAdhocGoalsFromWeekResult<T>;
}
