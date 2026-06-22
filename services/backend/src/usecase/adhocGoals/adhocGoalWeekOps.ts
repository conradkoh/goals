// fallow-ignore-file code-duplication
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/_generated/server';

export type AdhocWeekRef = {
  year: number;
  weekNumber: number;
};

export type AdhocGoalWithDomain = {
  goal: Doc<'goals'>;
  domain?: Doc<'domains'>;
};

export async function listIncompleteAdhocGoalsForWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  from: AdhocWeekRef
): Promise<AdhocGoalWithDomain[]> {
  const incompleteGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_adhoc_year_week', (q) =>
      q.eq('userId', userId).eq('year', from.year).eq('adhoc.weekNumber', from.weekNumber)
    )
    .filter((q) => q.eq(q.field('isComplete'), false))
    .collect();

  const domainIds = [
    ...new Set(incompleteGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
  ];
  const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
  const domainMap = new Map(
    domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
  );

  return incompleteGoals.map((goal) => {
    const effectiveDomainId = goal.domainId;
    return {
      goal,
      domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
    };
  });
}

export async function moveAdhocGoalsToWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  adhocGoals: AdhocGoalWithDomain[],
  to: AdhocWeekRef
): Promise<number> {
  await Promise.all(
    adhocGoals.map(async ({ goal }) => {
      if (!goal.adhoc) return;

      await ctx.db.patch('goals', goal._id, {
        year: to.year,
        adhoc: {
          ...goal.adhoc,
          weekNumber: to.weekNumber,
        },
      });

      const state = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goal._id))
        .first();

      if (state) {
        await ctx.db.patch('adhocGoalStates', state._id, {
          year: to.year,
          weekNumber: to.weekNumber,
        });
      }
    })
  );

  return adhocGoals.length;
}
