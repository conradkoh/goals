import { getNextPath, joinPath } from './path';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../convex/_generated/server';

type DbCtx = QueryCtx | MutationCtx;

/** Collect all descendant goal IDs for initiative propagation. */
async function collectDescendantGoalIds(
  ctx: DbCtx,
  goal: Doc<'goals'>,
  userId: Id<'users'>
): Promise<Id<'goals'>[]> {
  const ids = new Set<Id<'goals'>>();

  // Structured descendants via inPath prefix (quarterly → weekly → daily)
  if (!goal.adhoc) {
    const pathPrefix = joinPath(goal.inPath, goal._id);
    const structuredDescendants = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', goal.year).eq('quarter', goal.quarter)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field('inPath'), pathPrefix),
          q.lt(q.field('inPath'), getNextPath(pathPrefix))
        )
      )
      .collect();
    for (const child of structuredDescendants) {
      ids.add(child._id);
    }
  }

  // Adhoc descendants via parentId BFS
  await collectAdhocDescendants(ctx, userId, goal._id, ids);

  return [...ids];
}

async function collectAdhocDescendants(
  ctx: DbCtx,
  userId: Id<'users'>,
  parentGoalId: Id<'goals'>,
  acc: Set<Id<'goals'>>
): Promise<void> {
  const parent = await ctx.db.get('goals', parentGoalId);
  if (!parent) return;

  const adhocGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_adhoc_year_week', (q) => q.eq('userId', userId).eq('year', parent.year))
    .collect();

  const directChildren = adhocGoals.filter((g) => g.adhoc && g.parentId === parentGoalId);
  for (const child of directChildren) {
    if (!acc.has(child._id)) {
      acc.add(child._id);
      await collectAdhocDescendants(ctx, userId, child._id, acc);
    }
  }
}

/** Patch initiativeId on a goal and all its descendants. */
export async function propagateInitiativeToDescendants(
  ctx: MutationCtx,
  goal: Doc<'goals'>,
  userId: Id<'users'>,
  initiativeId: Id<'initiatives'> | undefined
): Promise<number> {
  const descendantIds = await collectDescendantGoalIds(ctx, goal, userId);
  const allIds = [goal._id, ...descendantIds];

  for (const id of allIds) {
    await ctx.db.patch('goals', id, { initiativeId });
  }

  return allIds.length;
}
