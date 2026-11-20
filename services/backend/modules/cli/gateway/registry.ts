import type { CliOpMap, CliOpName } from '@workspace/shared/utilities/cli-contract';
import type { SessionId } from 'convex-helpers/server/sessions';
import type { z } from 'zod';

import { exportQuarterSummaryOp } from './ops/exportSummary';
import { goalGetOp, goalListOp } from './ops/goalRead';
import { goalCreateOp, goalDeleteOp, goalRenameOp, goalSetCompleteOp } from './ops/goalWrite';
import { initiativeGetOp, initiativeListOp } from './ops/initiative';
import { whoamiOp } from './ops/whoami';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ActionCtx } from '../../../convex/_generated/server';
import type { ResolvedHandle } from '../../../convex/cli/authInternal';

/** Everything an op needs: the action context plus the resolved credential. */
export interface OpCtx {
  ctx: ActionCtx;
  handle: SessionId;
  userId: Id<'users'>;
  credentialId: Id<'cliCredentials'>;
  credential: ResolvedHandle;
}

/** One gateway op: a strict arg schema plus its implementation. */
export interface CliOpImpl<K extends CliOpName> {
  args: z.ZodType<CliOpMap[K]['args']>;
  run(o: OpCtx, args: CliOpMap[K]['args']): Promise<CliOpMap[K]['result']>;
}

/**
 * The only allowlist. `Record` over `CliOpName` makes adding an op to the
 * contract without implementing it a compile error, and an extra key too.
 * `call.ts` additionally refuses unknown keys with `Object.hasOwn`.
 */
export const CLI_OPS: { [K in CliOpName]: CliOpImpl<K> } = {
  'auth.whoami': whoamiOp,
  'goal.list': goalListOp,
  'goal.get': goalGetOp,
  'goal.create': goalCreateOp,
  'goal.rename': goalRenameOp,
  'goal.setComplete': goalSetCompleteOp,
  'goal.delete': goalDeleteOp,
  'initiative.list': initiativeListOp,
  'initiative.get': initiativeGetOp,
  'export.quarterSummary': exportQuarterSummaryOp,
};
