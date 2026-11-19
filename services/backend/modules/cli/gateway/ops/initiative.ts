import type { CliGoalRow, CliOpMap } from '@workspace/shared/utilities/cli-contract';
import { z } from 'zod';

import { api } from '../../../../convex/_generated/api';
import type { GoalsByInitiative } from '../../../../convex/initiative';
import { notFound } from '../errors';
import { requireOwnedInitiative } from '../guards';
import { goalToRow, initiativeToDto } from '../mappers';
import type { CliOpImpl } from '../registry';
import { boundList, idArg, limitArg } from './goalRead';

/** Flatten order of the initiative goal groups. */
const GROUP_ORDER = ['quarterly', 'weekly', 'daily', 'adhoc'] as const;

/** Flattens the four goal groups into one list, in contract order. */
function flattenGoals(groups: GoalsByInitiative): CliGoalRow[] {
  const rows: CliGoalRow[] = [];
  for (const group of GROUP_ORDER) {
    for (const goal of groups[group]) rows.push(goalToRow(goal));
  }
  return rows;
}

/** `initiative.list` — bounded list of the credential owner's initiatives. */
export const initiativeListOp: CliOpImpl<'initiative.list'> = {
  args: z.strictObject({ limit: limitArg }),
  async run(o, args): Promise<CliOpMap['initiative.list']['result']> {
    const initiatives = await o.ctx.runQuery(api.initiative.getInitiatives, {
      sessionId: o.handle,
    });
    return boundList(initiatives.map(initiativeToDto), args.limit);
  },
};

/** `initiative.get` — one owned initiative plus its bounded goals. */
export const initiativeGetOp: CliOpImpl<'initiative.get'> = {
  args: z.strictObject({ id: idArg }),
  async run(o, args): Promise<CliOpMap['initiative.get']['result']> {
    const initiativeId = await requireOwnedInitiative(o, args.id);
    const initiative = await o.ctx.runQuery(api.initiative.getInitiative, {
      sessionId: o.handle,
      initiativeId,
    });
    if (initiative === null) throw notFound();
    const groups = await o.ctx.runQuery(api.initiative.getGoalsByInitiative, {
      sessionId: o.handle,
      initiativeId,
    });
    return {
      initiative: initiativeToDto(initiative),
      goals: boundList(flattenGoals(groups)),
    };
  },
};
