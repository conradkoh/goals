import { propagateInitiativeToDescendants } from './propagateInitiativeToDescendants';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { MutationCtx } from '../../convex/_generated/server';

async function assertInitiativeOwnedByUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  initiativeId: Id<'initiatives'>
): Promise<void> {
  const initiative = await ctx.db.get('initiatives', initiativeId);
  if (!initiative || initiative.userId !== userId) {
    throw new Error('Initiative not found');
  }
}

export function initiativeIdGoalPatch(
  initiativeId: Id<'initiatives'> | null | undefined
): Partial<Doc<'goals'>> {
  if (initiativeId === undefined) return {};
  return { initiativeId: initiativeId === null ? undefined : initiativeId };
}

// fallow-ignore-next-line complexity
export async function patchGoalAndPropagateInitiative(
  ctx: MutationCtx,
  goalId: Id<'goals'>,
  userId: Id<'users'>,
  patchData: Partial<Doc<'goals'>>,
  initiativeId: Id<'initiatives'> | null | undefined
): Promise<void> {
  if (initiativeId !== undefined && initiativeId !== null) {
    await assertInitiativeOwnedByUser(ctx, userId, initiativeId);
  }

  await ctx.db.patch('goals', goalId, patchData);

  if (initiativeId === undefined) return;

  const updatedGoal = await ctx.db.get('goals', goalId);
  if (updatedGoal) {
    await propagateInitiativeToDescendants(
      ctx,
      updatedGoal,
      userId,
      initiativeId === null ? undefined : initiativeId
    );
  }
}
