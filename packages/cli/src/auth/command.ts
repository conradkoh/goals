import type { CommandContext } from '../deps.js';
import { UsageError } from '../errors.js';
import { runList } from './list.js';
import { runLogin } from './login.js';
import { runLogout } from './logout.js';
import { runStatus } from './status.js';
import { runUse } from './use.js';

type ActionRunner = (args: readonly string[], ctx: CommandContext) => Promise<void>;

const ACTIONS: Record<string, ActionRunner> = {
  login: runLogin,
  logout: runLogout,
  status: runStatus,
  list: runList,
  use: runUse,
};

export async function runAuthCommand(args: readonly string[], ctx: CommandContext): Promise<void> {
  const action: string | undefined = args[0];
  if (action === undefined) {
    throw new UsageError('goals auth <action>. Run `goals auth --help` for actions.');
  }
  const runner = ACTIONS[action];
  if (runner === undefined) {
    throw new UsageError(
      `unknown action '${action}' for 'goals auth'. Run \`goals auth --help\` for actions.`
    );
  }
  await runner(args.slice(1), ctx);
}
