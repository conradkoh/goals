import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { runList } from './list.js';
import { runLogin } from './login.js';
import { runLogout } from './logout.js';
import { runStatus } from './status.js';
import { runUse } from './use.js';

const ACTIONS = {
  login: runLogin,
  logout: runLogout,
  status: runStatus,
  list: runList,
  use: runUse,
};

export async function runAuthCommand(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runFamilyAction('auth', ACTIONS, args, ctx);
}
