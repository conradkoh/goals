import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { FakeBackend } from './__testing__/fakeBackend.js';
import { createFakeBackend } from './__testing__/fakeBackend.js';
import type { Harness } from './__testing__/harness.js';
import { createHarness } from './__testing__/harness.js';
import { extractGoalsCommands, tokenize } from './__testing__/skillCommands.js';
import { commandHelpFamilies } from './cli.js';

const REFERENCE = readFileSync(
  new URL('../skills/goals-cli/REFERENCE.md', import.meta.url),
  'utf8'
);

const COMMANDS = extractGoalsCommands(REFERENCE);

/** The fake backend's clock stays at the harness start instant. */
const backendClock = { now: Date.UTC(2026, 0, 1) };

const EXPORT_FILE = 'goals-2026.md';

interface World {
  backend: FakeBackend;
  harness: Harness;
}

/**
 * A world with the `default` and `dev` identities stored and their server tokens revoked.
 * `goals auth use dev` is a usage error when no identity exists, so every documented command
 * needs a stored identity to stay below exit 2; revoking the tokens then keeps every data
 * command failing before it can write an export file.
 */
async function createPreparedWorld(): Promise<World> {
  const backend = createFakeBackend({ now: () => backendClock.now });
  const harness = createHarness(backend);
  const first = await harness.run(['auth', 'login']);
  const second = await harness.run(['auth', 'login', '--name', 'dev', '--env', 'dev']);
  if (first.code !== 0 || second.code !== 0) {
    harness.cleanup();
    throw new Error(`could not seed identities: ${first.stderr}${second.stderr}`);
  }
  for (const issued of backend.issued) {
    if (issued.token !== '') backend.invalidate(issued.token);
  }
  return { backend, harness };
}

describe('skill reference consistency', () => {
  it('extracts a command per line from the bash fences', () => {
    expect(COMMANDS.length).toBeGreaterThanOrEqual(25);
  });

  it.each(COMMANDS)('parses `%s`', async (commandLine) => {
    const { harness } = await createPreparedWorld();
    try {
      const result = await harness.run(tokenize(commandLine));

      expect(result.code).not.toBe(2);
      expect(result.stderr.startsWith('Usage:')).toBe(false);
      expect(existsSync(EXPORT_FILE)).toBe(false);
    } finally {
      harness.cleanup();
    }
  });

  it('documents every help family action', () => {
    const commands = commandHelpFamilies.flatMap((family) =>
      Object.keys(family.actions).map((action) => `goals ${family.name} ${action}`)
    );

    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) expect(REFERENCE).toContain(command);
  });

  it('lists recipes a to h in order', () => {
    const positions = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => {
      const at = REFERENCE.indexOf(`\n### Recipe ${letter}:`);
      expect(at, `Recipe ${letter}`).toBeGreaterThanOrEqual(0);
      return at;
    });

    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it.each(['--yes', '--json', 'GOALS_AS', 'goal-log history', 'Not logged in'])(
    'states the %s rule',
    (text) => {
      expect(REFERENCE).toContain(text);
    }
  );

  it('fails the parser check on a bogus flag, so the check can fail', async () => {
    const [command] = extractGoalsCommands('```bash\ngoals goal list --bogus\n```');
    const { harness } = await createPreparedWorld();
    try {
      const result = await harness.run(tokenize(command));

      expect(result.code).toBe(2);
      expect(result.stderr.startsWith('Usage:')).toBe(true);
    } finally {
      harness.cleanup();
    }
  });

  it('rejects a bash fence line that is not a goals command', () => {
    expect(() => extractGoalsCommands('```bash\nnpm i -g goals-cli\n```')).toThrow(
      /not a goals command/
    );
  });
});

describe('tokenize', () => {
  it('keeps quoted arguments together', () => {
    expect(tokenize('goals goal create --title "Ship the beta"')).toEqual([
      'goal',
      'create',
      '--title',
      'Ship the beta',
    ]);
    expect(tokenize("goals goal rename <goal-id> --title 'Two words'")).toEqual([
      'goal',
      'rename',
      '<goal-id>',
      '--title',
      'Two words',
    ]);
  });

  it('throws on an unterminated quote', () => {
    expect(() => tokenize('goals goal get "abc')).toThrow(/unterminated/);
  });

  it('requires the goals prefix', () => {
    expect(() => tokenize('npm i -g goals-cli')).toThrow(/does not start with goals/);
  });
});
