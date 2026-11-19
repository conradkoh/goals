import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { runGoalGet, runGoalList } from './goal-read.js';
import {
  runGoalComplete,
  runGoalCreate,
  runGoalDelete,
  runGoalRename,
  runGoalReopen,
} from './goal-write.js';

const ACTIONS = {
  list: runGoalList,
  get: runGoalGet,
  create: runGoalCreate,
  rename: runGoalRename,
  complete: runGoalComplete,
  reopen: runGoalReopen,
  delete: runGoalDelete,
};

export async function runGoalCommand(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runFamilyAction('goal', ACTIONS, args, ctx);
}
