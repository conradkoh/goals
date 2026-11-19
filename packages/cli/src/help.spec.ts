import { existsSync, readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FakeBackend } from './__testing__/fakeBackend.js';
import { createFakeBackend } from './__testing__/fakeBackend.js';
import type { Harness } from './__testing__/harness.js';
import { createHarness } from './__testing__/harness.js';

function golden(name: string): string {
  return readFileSync(new URL(`./__views__/${name}.txt`, import.meta.url), 'utf8');
}

const HELP_PAGES: [string, string[]][] = [
  ['root-help', ['--help']],
  ['auth-help', ['auth', '--help']],
  ['auth-login-help', ['auth', 'login', '--help']],
  ['auth-logout-help', ['auth', 'logout', '--help']],
  ['auth-status-help', ['auth', 'status', '--help']],
  ['auth-list-help', ['auth', 'list', '--help']],
  ['auth-use-help', ['auth', 'use', '--help']],
];

describe('help output', () => {
  let backend: FakeBackend;
  let harness: Harness;

  beforeEach(() => {
    backend = createFakeBackend({ now: () => harness.clock.now });
    harness = createHarness(backend);
  });

  afterEach(() => {
    harness.cleanup();
  });

  it.each(HELP_PAGES)(
    'renders the %s golden, off the network and off the disk',
    async (name, argv) => {
      const result = await harness.run(argv);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe(golden(name));
      expect(result.stderr).toBe('');
      expect(backend.requests).toEqual([]);
      expect(existsSync(harness.credentialsPath)).toBe(false);
    }
  );

  it('accepts -h for the root page', async () => {
    const result = await harness.run(['-h']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(golden('root-help'));
  });

  it('accepts -h after a family', async () => {
    const result = await harness.run(['auth', '-h']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(golden('auth-help'));
  });

  it('resolves help before validating the other flags', async () => {
    const result = await harness.run([
      'auth',
      'login',
      '--webapp-url',
      'https://x.example',
      '--help',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(golden('auth-login-help'));
    expect(backend.requests).toEqual([]);
  });

  it('reports an unknown command', async () => {
    const result = await harness.run(['foo', '--help']);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain("unknown command 'foo'");
    expect(result.stderr).toContain('goals --help');
  });

  it('reports an unknown action', async () => {
    const result = await harness.run(['auth', 'nope', '--help']);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain("unknown action 'nope' for 'goals auth'");
    expect(result.stderr).toContain('goals auth --help');
  });
});
