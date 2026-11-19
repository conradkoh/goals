import { invalidArgument, notFound } from './errors';
import type { OpCtx } from './registry';
import { internal } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { OwnedGoalMeta } from '../../../convex/cli/ops';
import { getQuarterWeeks } from '../../../src/usecase/quarter/getQuarterWeeks';

/**
 * Ownership preflights shared by gateway ops.
 *
 * Each guard reads through a read-only internal query that normalises the id
 * first, then throws the same 404 for foreign, missing, malformed and
 * wrong-table ids. The existing public function re-checks ownership, so the
 * preflight only removes the oracle and the input-leaking validator error.
 */

/** Requires an owned goal and returns its normalised metadata. */
export async function requireOwnedGoal(o: OpCtx, id: string): Promise<OwnedGoalMeta> {
  const meta = await o.ctx.runQuery(internal.cli.ops.getOwnedGoalMeta, {
    userId: o.userId,
    goalId: id,
  });
  if (meta === null) throw notFound();
  return meta;
}

/** Requires an owned initiative and returns its normalised id. */
export async function requireOwnedInitiative(o: OpCtx, id: string): Promise<Id<'initiatives'>> {
  const initiativeId = await o.ctx.runQuery(internal.cli.ops.getOwnedInitiativeId, {
    userId: o.userId,
    initiativeId: id,
  });
  if (initiativeId === null) throw notFound();
  return initiativeId;
}

/** Requires an owned domain and returns its normalised id. */
export async function requireOwnedDomain(o: OpCtx, id: string): Promise<Id<'domains'>> {
  const domainId = await o.ctx.runQuery(internal.cli.ops.getOwnedDomainId, {
    userId: o.userId,
    domainId: id,
  });
  if (domainId === null) throw notFound();
  return domainId;
}

/** Rejects a week number that does not belong to the quarter. */
export function assertWeekInQuarter(year: number, quarter: number, week: number): void {
  if (!getQuarterWeeks(year, quarter).weeks.includes(week)) {
    throw invalidArgument('week is outside the quarter');
  }
}
