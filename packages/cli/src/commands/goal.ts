import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { runGoalGet, runGoalList } from './goal-read.js';

const ACTIONS = {
  list: runGoalList,
  get: runGoalGet,
};

export async function runGoalCommand(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runFamilyAction('goal', ACTIONS, args, ctx);
}
