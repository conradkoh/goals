import {
  combineDryRunResults,
  combineUpdateResults,
  emptyDryRunResult,
  emptyUpdateResult,
} from './combinePullWeekResults';
import {
  moveAdhocGoalsFromWeekUsecase,
  hasIncompleteAdhocGoalsInWeek,
} from './moveAdhocGoalsFromWeek';
import {
  moveHierarchicalGoalsFromWeekUsecase,
  hasHierarchicalGoalStatesInWeek,
} from './moveHierarchicalGoalsFromWeek';
import type { DryRunResult, MoveGoalsFromWeekArgs, MoveGoalsFromWeekResult } from './types';
import { getPreviousISOWeek, isFirstWeekOfQuarter, normalizeTimePeriod } from './weekPeriod';
import type { MutationCtx } from '../../../convex/_generated/server';

/**
 * Move hierarchical and adhoc goals from one week to another.
 */
export async function moveGoalsFromWeekUsecase<T extends MoveGoalsFromWeekArgs>(
  ctx: MutationCtx,
  args: T
): Promise<MoveGoalsFromWeekResult<T>> {
  const from = normalizeTimePeriod(args.from);
  const to = normalizeTimePeriod(args.to);
  const { userId, dryRun } = args;

  const [hierarchicalResult, adhocResult] = await Promise.all([
    moveHierarchicalGoalsFromWeekUsecase(ctx, { userId, from, to, dryRun }),
    moveAdhocGoalsFromWeekUsecase(ctx, { userId, from, to, dryRun }),
  ]);

  if (dryRun) {
    return combineDryRunResults(hierarchicalResult, adhocResult) as MoveGoalsFromWeekResult<T>;
  }

  return combineUpdateResults(hierarchicalResult, adhocResult) as MoveGoalsFromWeekResult<T>;
}

/**
 * Move goals from the last non-empty week to the target week.
 * Scans backwards with separate probes for hierarchical and adhoc goals.
 */
// fallow-ignore-next-line complexity
export async function moveGoalsFromLastNonEmptyWeekUsecase(
  ctx: MutationCtx,
  args: MoveGoalsFromWeekArgs
): Promise<DryRunResult | MoveGoalsFromWeekResult<typeof args>> {
  const { userId, dryRun } = args;
  const to = normalizeTimePeriod(args.to);

  if (isFirstWeekOfQuarter(to.weekNumber)) {
    return dryRun ? emptyDryRunResult() : emptyUpdateResult();
  }

  let candidate = getPreviousISOWeek(to);
  const maxWeeksToSearch = 13;

  for (let i = 0; i < maxWeeksToSearch; i++) {
    const [hasHierarchical, hasAdhoc] = await Promise.all([
      hasHierarchicalGoalStatesInWeek(ctx, userId, candidate),
      hasIncompleteAdhocGoalsInWeek(ctx, userId, candidate),
    ]);

    if (hasHierarchical || hasAdhoc) {
      const preview = await moveGoalsFromWeekUsecase(ctx, {
        userId,
        from: candidate,
        to,
        dryRun: true as const,
      });

      const hasContent =
        preview.canPull || (preview.skippedGoals && preview.skippedGoals.length > 0);

      if (hasContent) {
        if (dryRun) return preview as DryRunResult;
        return await moveGoalsFromWeekUsecase(ctx, {
          userId,
          from: candidate,
          to,
          dryRun: false as const,
        });
      }
    }

    candidate = getPreviousISOWeek(candidate);
  }

  return dryRun ? emptyDryRunResult() : emptyUpdateResult();
}
