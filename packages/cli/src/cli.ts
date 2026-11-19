#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { runAuthCommand } from './auth/command.js';
import { authHelp } from './auth/help.js';
import { goalHelp } from './commands/goal-help.js';
import { runGoalCommand } from './commands/goal.js';
import type { CliDeps, CommandContext } from './deps.js';
import { defaultDeps } from './deps.js';
import { CliError, safeMessage, UsageError } from './errors.js';
import type { CommandFamilyHelp } from './help.js';
import { resolveHelp, wantsHelp } from './help.js';
import { createApiClient } from './http.js';
import { readCliVersion } from './version.js';

/** Every help page the CLI knows; later packages append their families here. */
export const commandHelpFamilies: readonly CommandFamilyHelp[] = [authHelp, goalHelp];

type FamilyRunner = (args: readonly string[], ctx: CommandContext) => Promise<void>;

const FAMILIES: Record<string, FamilyRunner> = {
  auth: runAuthCommand,
  goal: runGoalCommand,
};

const ROOT_USAGE = 'goals <command> [options]. Run `goals --help` for commands.';

function unknownCommand(name: string): UsageError {
  return new UsageError(`unknown command '${name}'. Run \`goals --help\` for commands.`);
}

/** One line at most: stack traces never reach the terminal. */
function firstLine(message: string): string {
  return message.split(/\r?\n/, 1)[0] ?? '';
}

function report(deps: CliDeps, error: unknown): number {
  const message = error instanceof Error ? error.message : error;
  if (error instanceof UsageError) {
    deps.stderr.write(`${firstLine(String(message))}\n`);
    return 2;
  }
  if (error instanceof CliError) {
    deps.stderr.write(`${firstLine(String(message))}\n`);
    return 1;
  }
  deps.stderr.write(`Goals command failed: ${safeMessage(message, 'unexpected error')}\n`);
  return 1;
}

/** True only for the bare `--version` invocation. */
function isVersionRequest(argv: readonly string[]): boolean {
  return argv.length === 1 && argv[0] === '--version';
}

/** Runs the requested command family; unknown names are a usage error. */
async function runCommand(argv: readonly string[], ctx: CommandContext): Promise<void> {
  const [name] = argv;
  if (name === undefined) throw new UsageError(ROOT_USAGE);
  const runner = Object.hasOwn(FAMILIES, name) ? FAMILIES[name] : undefined;
  if (runner === undefined) throw unknownCommand(name);
  await runner(argv.slice(1), ctx);
}

/** Dispatches one invocation; every failure is left to `report`. */
async function dispatch(argv: readonly string[], ctx: CommandContext): Promise<number> {
  if (isVersionRequest(argv)) {
    ctx.deps.stdout.write(`${readCliVersion()}\n`);
    return 0;
  }
  if (wantsHelp(argv)) {
    ctx.deps.stdout.write(resolveHelp(argv, commandHelpFamilies));
    return 0;
  }
  await runCommand(argv, ctx);
  return 0;
}

/**
 * Runs the CLI and resolves with the process exit code: 0 success, 2 usage error, 1 anything
 * else. All side effects come from `deps`, so specs drive it without touching the process.
 */
export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  overrides: Partial<CliDeps> = {}
): Promise<number> {
  const deps: CliDeps = { ...defaultDeps(), ...overrides };
  const api = createApiClient({ fetch: deps.fetch, timeoutMs: deps.timeoutMs });
  try {
    return await dispatch(argv, { deps, api });
  } catch (error) {
    return report(deps, error);
  }
}

/** True when this module is the executed script (directly, via a bin symlink, or via npx). */
function isEntryPoint(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  void runCli().then((code) => {
    process.exitCode = code;
  });
}
