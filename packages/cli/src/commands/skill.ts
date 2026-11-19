import { readFileSync } from 'node:fs';

import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { UsageError } from '../errors.js';
import { readCliVersion } from '../version.js';

const SKILL_DIR = new URL('../../skills/goals-cli/', import.meta.url);

/** One checked-in skill file; the same files are shipped in the package `files` list. */
function readSkillFile(name: 'SKILL.md' | 'REFERENCE.md'): string {
  return readFileSync(new URL(name, SKILL_DIR), 'utf8').trimEnd();
}

/** Install guidance, the stub in a `markdown` fence, `---`, then the full reference. */
function renderActivation(version: string, stub: string, reference: string): string {
  return [
    `Goals CLI ${version} - agent skill`,
    '',
    "Save the stub below as a skill named `goals-cli` in your agent's skills directory (for example `.claude/skills/goals-cli/SKILL.md`) so you can find it later. The full reference follows the `---` line; read it before running goals commands.",
    '',
    '```markdown',
    stub,
    '```',
    '',
    '---',
    '',
    reference,
    '',
  ].join('\n');
}

/** Prints the skill; touches no credentials, network or files other than the two shipped files. */
async function runActivate(args: readonly string[], ctx: CommandContext): Promise<void> {
  if (args.length > 0) throw new UsageError('goals skill activate');
  ctx.deps.stdout.write(
    renderActivation(readCliVersion(), readSkillFile('SKILL.md'), readSkillFile('REFERENCE.md'))
  );
}

const ACTIONS = { activate: runActivate };

export async function runSkillCommand(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runFamilyAction('skill', ACTIONS, args, ctx);
}
