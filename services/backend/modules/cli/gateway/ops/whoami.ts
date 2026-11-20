import type { CliOpMap } from '@workspace/shared/utilities/cli-contract';
import { z } from 'zod';

import { internal } from '../../../../convex/_generated/api';
import { CliGatewayError } from '../errors';
import type { CliOpImpl } from '../registry';

/** `auth.whoami` — identity metadata for the presented credential. */
export const whoamiOp: CliOpImpl<'auth.whoami'> = {
  args: z.strictObject({}),
  async run(o): Promise<CliOpMap['auth.whoami']['result']> {
    const identity = await o.ctx.runQuery(internal.cli.ops.getWhoami, {
      credentialId: o.credentialId,
      userId: o.userId,
    });
    // The credential was revoked between resolveHandle and this query.
    if (identity === null) throw new CliGatewayError(401, 'unauthorized', 'Unauthorized');
    return identity;
  },
};
