import { existsSync, readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from './__testing__/fakeBackend.js';
import { createFakeBackend } from './__testing__/fakeBackend.js';
import type { Harness } from './__testing__/harness.js';
import { createHarness } from './__testing__/harness.js';
import { DEFAULT_ENDPOINTS } from './endpoints.js';

const LOGIN_ARGS = [
  'auth',
  'login',
  '--webapp-url',
  'https://goals.example.com',
  '--convex-url',
  'https://example-123.convex.site',
];

/** The fake backend's clock stays at the harness start instant. */
const backendClock = { now: Date.UTC(2026, 0, 1) };

const cleanups: (() => void)[] = [];

function createWorld(options: Partial<FakeBackendOptions> = {}): {
  backend: FakeBackend;
  harness: Harness;
} {
  const backend = createFakeBackend({ ...options, now: () => backendClock.now });
  const harness = createHarness(backend);
  cleanups.push(() => {
    harness.cleanup();
  });
  return { backend, harness };
}

function manifestVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as { version: string };
  return manifest.version;
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals cli dispatch', () => {
  it('prints the installed version', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['--version']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`${manifestVersion()}\n`);
    expect(result.stderr).toBe('');
  });

  it('explains itself when called with no arguments', async () => {
    const { harness } = createWorld();

    const result = await harness.run([]);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(
      'Usage: goals <command> [options]. Run `goals --help` for commands.\n'
    );
  });

  it('rejects an unknown command', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['frobnicate']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      "Usage: unknown command 'frobnicate'. Run `goals --help` for commands.\n"
    );
  });

  it('rejects a bare goal family', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['goal']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      'Usage: goals goal <action>. Run `goals goal --help` for actions.\n'
    );
  });

  it('rejects a bare initiative family', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['initiative']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      'Usage: goals initiative <action>. Run `goals initiative --help` for actions.\n'
    );
  });

  it('treats an inherited object key as an unknown action', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['goal', 'constructor']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      "Usage: unknown action 'constructor' for 'goals goal'. Run `goals goal --help` for actions.\n"
    );
  });

  it('rejects a bare auth family', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      'Usage: goals auth <action>. Run `goals auth --help` for actions.\n'
    );
  });

  it('reports a flag error on one line with no stack', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth', 'status', '--quarter', '3']);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
    expect(result.stderr).not.toContain('    at ');
    expect(result.stderr).toContain('--quarter');
  });

  it('requires the label for auth use', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth', 'use']);

    expect(result.code).toBe(2);
    expect(result.stderr).toBe(
      'Usage: missing required argument <label>. Run `goals auth use --help` for usage.\n'
    );
  });

  it('requires both endpoint flags on login and makes no request', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['auth', 'login', '--webapp-url', 'https://goals.example']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--webapp-url and --convex-url must be passed together');
    expect(backend.requests).toEqual([]);
  });

  it.skipIf(DEFAULT_ENDPOINTS.webappUrl !== '')(
    'refuses plain login while no default endpoints are configured',
    async () => {
      const { backend, harness } = createWorld();

      const result = await harness.run(['auth', 'login']);

      expect(result.code).toBe(2);
      expect(result.stderr.startsWith('Usage: ')).toBe(true);
      expect(result.stderr).toContain('no default Goals endpoints are configured');
      expect(backend.requests).toEqual([]);
    }
  );

  it('reports a missing login without creating a file', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['auth', 'status']);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Not logged in; run `goals auth login`.\n');
    expect(existsSync(harness.credentialsPath)).toBe(false);
    expect(backend.requests).toEqual([]);
  });

  it('prints exactly one line for an unexpected exception', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['--version'], {
      stdout: {
        write: () => {
          throw new Error('boom');
        },
      },
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Goals command failed: boom\n');
  });

  it('hides an unexpected message that mentions a token', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['--version'], {
      stdout: {
        write: () => {
          throw new Error('token could not be written');
        },
      },
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Goals command failed: unexpected error\n');
  });

  it('runs a command through the auth family', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 0 });

    const result = await harness.run(LOGIN_ARGS);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Logged in as Ada Lovelace (identity 'default', environment default).\n"
    );
    expect(backend.requests.length).toBeGreaterThan(0);
  });
});
