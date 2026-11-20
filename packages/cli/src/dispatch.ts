import type { CommandContext } from './deps.js';
import { UsageError } from './errors.js';

/** One action of a command family, receiving everything after the action name. */
export type ActionRunner = (args: readonly string[], ctx: CommandContext) => Promise<void>;

/**
 * Dispatches `goals <family> <action>`; the lookup is own-property only, so inherited
 * object keys (`constructor`, `__proto__`) are unknown actions rather than crashes.
 */
export async function runFamilyAction(
  family: string,
  actions: Record<string, ActionRunner>,
  args: readonly string[],
  ctx: CommandContext
): Promise<void> {
  const action = args[0];
  if (action === undefined) {
    throw new UsageError(`goals ${family} <action>. Run \`goals ${family} --help\` for actions.`);
  }
  const runner = Object.hasOwn(actions, action) ? actions[action] : undefined;
  if (runner === undefined) {
    throw new UsageError(
      `unknown action '${action}' for 'goals ${family}'. Run \`goals ${family} --help\` for actions.`
    );
  }
  await runner(args.slice(1), ctx);
}
