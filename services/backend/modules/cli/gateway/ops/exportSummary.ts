import type { CliOpMap } from '@workspace/shared/utilities/cli-contract';
import { z } from 'zod';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { notFound } from '../errors';
import { requireOwnedDomain, requireOwnedGoal } from '../guards';
import { toMarkdownSummary } from '../mappers';
import type { CliOpImpl, OpCtx } from '../registry';
import { idArg, yearArg } from './goalRead';

/** Literal used by the dashboard to mean "no domain". */
const UNCATEGORIZED = 'UNCATEGORIZED';

/** True when a goal metadata describes a scheduled quarterly goal. */
function isQuarterlyGoal(meta: { isAdhoc: boolean; depth: number }): boolean {
  return !meta.isAdhoc && meta.depth === 0;
}

/** True when a goal metadata belongs to the requested quarter. */
function isInQuarter(
  meta: { year: number; quarter?: number },
  year: number,
  quarter: number
): boolean {
  return meta.year === year && meta.quarter === quarter;
}

/** Requires an owned quarterly goal that belongs to the requested quarter. */
async function requireQuarterlyGoalOfQuarter(
  o: OpCtx,
  goalId: string,
  year: number,
  quarter: number
): Promise<Id<'goals'>> {
  const meta = await requireOwnedGoal(o, goalId);
  if (!isQuarterlyGoal(meta) || !isInQuarter(meta, year, quarter)) throw notFound();
  return meta.id;
}

/** Resolves explicit goal ids, rejecting anything but an owned quarterly goal of this quarter. */
async function resolveGoalIds(
  o: OpCtx,
  goalIds: string[],
  year: number,
  quarter: number
): Promise<Id<'goals'>[]> {
  const ids: Id<'goals'>[] = [];
  for (const goalId of goalIds) {
    ids.push(await requireQuarterlyGoalOfQuarter(o, goalId, year, quarter));
  }
  return ids;
}

/** All owned quarterly goals of the requested quarter. */
async function defaultGoalIds(o: OpCtx, year: number, quarter: number): Promise<Id<'goals'>[]> {
  const goals = await o.ctx.runQuery(api.dashboard.getAllQuarterlyGoalsForQuarter, {
    sessionId: o.handle,
    year,
    quarter,
  });
  return goals.map((goal) => goal._id);
}

/** Maps each adhoc domain filter entry to its normalised form, 404 on foreign ids. */
async function resolveAdhocDomains(
  o: OpCtx,
  domainIds: string[] | undefined
): Promise<(Id<'domains'> | typeof UNCATEGORIZED)[] | undefined> {
  if (domainIds === undefined) return undefined;
  const resolved: (Id<'domains'> | typeof UNCATEGORIZED)[] = [];
  for (const domainId of domainIds) {
    resolved.push(
      domainId === UNCATEGORIZED ? UNCATEGORIZED : await requireOwnedDomain(o, domainId)
    );
  }
  return resolved;
}

/** `export.quarterSummary` — the shared markdown contract for one quarter. */
export const exportQuarterSummaryOp: CliOpImpl<'export.quarterSummary'> = {
  args: z.strictObject({
    year: yearArg,
    quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    goalIds: z.array(idArg).max(200).optional(),
    includeAdhoc: z.boolean().optional(),
    adhocDomainIds: z.array(idArg).max(100).optional(),
  }),
  async run(o, args): Promise<CliOpMap['export.quarterSummary']['result']> {
    const ids =
      args.goalIds === undefined
        ? await defaultGoalIds(o, args.year, args.quarter)
        : await resolveGoalIds(o, args.goalIds, args.year, args.quarter);
    const adhocDomainIds = await resolveAdhocDomains(o, args.adhocDomainIds);
    const summary = await o.ctx.runQuery(api.dashboard.getQuarterSummary, {
      sessionId: o.handle,
      year: args.year,
      quarter: args.quarter,
      selectedQuarterlyGoalIds: ids,
      includeAdhocGoals: args.includeAdhoc ?? true,
      ...(adhocDomainIds !== undefined ? { adhocDomainIds } : {}),
    });
    return { summary: toMarkdownSummary(summary) };
  },
};
