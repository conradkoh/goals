import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';
import type { CredentialsFile, StoredCredential } from '../credentials.js';

const WEBAPP = 'https://goals.example.com';
const CONVEX = 'https://example-123.convex.site';
const DEV_CONVEX = 'http://127.0.0.1:3212';
const NOT_LOGGED_IN = 'Not logged in; run `goals auth login`.\n';
const INVALID = 'Credentials are invalid, expired or revoked; run `goals auth login` again.\n';

const STATUS_TEXT = [
  'Name:         Ada Lovelace',
  'User ID:      user_1',
  'Identity:     work',
  'Environment:  default',
  'Server:       example-123.convex.site',
  'Created:      2026-01-01T00:00:00.000Z',
  'Expires:      2026-06-30T00:00:00.000Z',
  'Valid:        yes',
  '',
].join('\n');

/** The fake backend's clock stays at the harness start instant. */
const backendClock = { now: Date.UTC(2026, 0, 1) };

const cleanups: (() => void)[] = [];

function createWorld(options: Partial<FakeBackendOptions> = {}): {
  backend: FakeBackend;
  harness: Harness;
} {
  const backend = createFakeBackend({ pendingPolls: 0, ...options, now: () => backendClock.now });
  const harness = createHarness(backend);
  cleanups.push(() => {
    harness.cleanup();
  });
  return { backend, harness };
}

function loginArgs(options: { name?: string; environment?: string; convexUrl?: string }): string[] {
  return [
    'auth',
    'login',
    ...(options.name === undefined ? [] : ['--name', options.name]),
    ...(options.environment === undefined ? [] : ['--env', options.environment]),
    '--webapp-url',
    WEBAPP,
    '--convex-url',
    options.convexUrl ?? CONVEX,
  ];
}

/** A second CLI process wired to the same backend and the same credential file. */
function createSharingHarness(backend: FakeBackend, source: Harness): Harness {
  const harness = createHarness(backend, { storeOptions: { filePath: source.credentialsPath } });
  cleanups.push(() => {
    harness.cleanup();
  });
  return harness;
}

function requestUrl(input: string | URL | Request): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
}

function readStore(harness: Harness): CredentialsFile {
  return JSON.parse(readFileSync(harness.credentialsPath, 'utf8')) as CredentialsFile;
}

function writeStore(harness: Harness, file: CredentialsFile): void {
  writeFileSync(harness.credentialsPath, `${JSON.stringify(file, null, 2)}\n`);
}

function clearDefault(harness: Harness): void {
  const file = readStore(harness);
  delete file.defaultLabel;
  writeStore(harness, file);
}

async function signIn(harness: Harness, name?: string): Promise<StoredCredential> {
  const result = await harness.run(loginArgs({ name }));
  expect(result.code).toBe(0);
  const account = readStore(harness).accounts[0];
  expect(account).toBeDefined();
  return account as StoredCredential;
}

async function signInTwo(harness: Harness, backend: FakeBackend): Promise<void> {
  await harness.run(loginArgs({}));
  backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });
  const result = await harness.run(
    loginArgs({ name: 'dev', environment: 'dev', convexUrl: DEV_CONVEX })
  );
  expect(result.code).toBe(0);
}

function expectNoSecrets(accounts: readonly StoredCredential[], ...outputs: string[]): void {
  for (const account of accounts) {
    for (const output of outputs) {
      expect(output).not.toContain(account.token);
      expect(output).not.toContain(account.credentialId);
    }
  }
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals auth status', () => {
  it('prints the identity block', async () => {
    const { backend, harness } = createWorld();
    const account = await signIn(harness, 'work');

    const result = await harness.run(['auth', 'status']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(STATUS_TEXT);
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toContain(account.token);
    expect(result.stdout).not.toContain(account.credentialId);
    expect(backend.requests.some((request) => request.url.endsWith('/cli/v1/call'))).toBe(true);
  });

  it('prints one JSON object with the documented keys', async () => {
    const { harness } = createWorld();
    const account = await signIn(harness, 'work');

    const result = await harness.run(['auth', 'status', '--json']);

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed).toEqual({
      name: 'Ada Lovelace',
      userId: 'user_1',
      label: 'work',
      environment: null,
      convexHost: 'example-123.convex.site',
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-06-30T00:00:00.000Z',
      valid: true,
    });
    expect(Object.keys(parsed)).toEqual([
      'name',
      'userId',
      'label',
      'environment',
      'convexHost',
      'createdAt',
      'expiresAt',
      'valid',
    ]);
    expectNoSecrets([account], result.stdout, result.stderr);
  });

  it('fails when the credential was revoked on the server', async () => {
    const { backend, harness } = createWorld();
    const account = await signIn(harness, 'work');
    backend.invalidate(account.token);

    const result = await harness.run(['auth', 'status']);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(INVALID);
  });

  it('selects an identity with --as', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'status', '--as', 'dev']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Identity:     dev');
    expect(result.stdout).toContain('Name:         Grace Hopper');
    expect(result.stdout).toContain('Environment:  dev');
    expectNoSecrets(readStore(harness).accounts, result.stdout, result.stderr);
  });

  it('selects an identity with GOALS_AS', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'status'], { env: { GOALS_AS: 'dev' } });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Identity:     dev');
  });

  it('prefers --as over GOALS_AS', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'status', '--as', 'default'], {
      env: { GOALS_AS: 'dev' },
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Identity:     default');
    expect(result.stdout).toContain('Name:         Ada Lovelace');
  });

  it('rejects an unknown label', async () => {
    const { harness } = createWorld();
    await signIn(harness, 'work');

    const result = await harness.run(['auth', 'status', '--as', 'nope']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain("no identity labelled 'nope'");
    expect(result.stdout).toBe('');
  });

  it('asks for --as when several identities have no default', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);
    clearDefault(harness);
    const before = readFileSync(harness.credentialsPath, 'utf8');

    const result = await harness.run(['auth', 'status']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('--as');
    expect(readFileSync(harness.credentialsPath, 'utf8')).toBe(before);
  });

  it('reports a missing login', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth', 'status']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe(NOT_LOGGED_IN);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });
});

describe('goals auth list', () => {
  it('says when nothing is stored', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(['auth', 'list']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('No identities stored. Run `goals auth login`.\n');
    expect(result.stderr).toBe('');
    expect(backend.requests).toEqual([]);
  });

  it('prints an empty JSON array', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth', 'list', '--json']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('[]\n');
  });

  it('prints a table and marks the default row', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'list']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        '  LABEL    NAME          ENVIRONMENT  SERVER',
        '* default  Ada Lovelace  default      example-123.convex.site',
        '  dev      Grace Hopper  dev          127.0.0.1:3212',
        '',
      ].join('\n')
    );
    expectNoSecrets(readStore(harness).accounts, result.stdout, result.stderr);
  });

  it('prints a JSON array without secrets', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'list', '--json']);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        label: 'default',
        name: 'Ada Lovelace',
        userId: 'user_1',
        environment: null,
        convexHost: 'example-123.convex.site',
        isDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-06-30T00:00:00.000Z',
      },
      {
        label: 'dev',
        name: 'Grace Hopper',
        userId: 'user_2',
        environment: 'dev',
        convexHost: '127.0.0.1:3212',
        isDefault: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-06-30T00:00:00.000Z',
      },
    ]);
    expectNoSecrets(readStore(harness).accounts, result.stdout, result.stderr);
  });

  it('never prints tokens and makes no network call', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);
    const requests = backend.requests.length;

    const result = await harness.run(['auth', 'list']);

    expect(backend.requests).toHaveLength(requests);
    expectNoSecrets(readStore(harness).accounts, result.stdout, result.stderr);
  });
});

describe('goals auth use', () => {
  it('switches the default identity', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'use', 'dev']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Default identity is now 'dev'.\n");
    expect(result.stderr).toBe('');
    expect(readStore(harness).defaultLabel).toBe('dev');
    expectNoSecrets(readStore(harness).accounts, result.stdout, result.stderr);

    const list = await harness.run(['auth', 'list']);
    expect(list.stdout.split('\n')[2]?.startsWith('* dev')).toBe(true);
  });

  it('rejects an unknown label without touching the file', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);
    const before = readFileSync(harness.credentialsPath, 'utf8');

    const result = await harness.run(['auth', 'use', 'nope']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("no identity labelled 'nope'");
    expect(readFileSync(harness.credentialsPath, 'utf8')).toBe(before);
  });
});

describe('goals auth logout', () => {
  it('revokes the credential, removes it and clears the default', async () => {
    const { harness } = createWorld();
    const account = await signIn(harness);
    const before = readFileSync(harness.credentialsPath, 'utf8');

    const result = await harness.run(['auth', 'logout']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Logged out of 'default'.\n");
    expect(result.stderr).toBe('');
    const store = readStore(harness);
    expect(store.accounts).toEqual([]);
    expect(store.defaultLabel).toBeUndefined();
    expectNoSecrets([account], result.stdout, result.stderr);

    writeFileSync(harness.credentialsPath, before);
    const status = await harness.run(['auth', 'status']);
    expect(status.code).toBe(1);
    expect(status.stderr).toBe(INVALID);
  });

  it('removes the local entry when the server cannot be reached', async () => {
    const { backend, harness } = createWorld();
    const account = await signIn(harness);
    backend.setFailNetwork(true);

    const result = await harness.run(['auth', 'logout']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe(
      'Warning: could not revoke the credential on the server (Unable to contact Goals; please retry.); it was removed from this machine only.\n'
    );
    expect(result.stdout).toBe("Logged out of 'default'.\n");
    expect(readStore(harness).accounts).toEqual([]);
    expectNoSecrets([account], result.stdout, result.stderr);
  });

  it('treats an already invalid credential as success', async () => {
    const { backend, harness } = createWorld();
    const account = await signIn(harness);
    backend.invalidate(account.token);

    const result = await harness.run(['auth', 'logout']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe("Logged out of 'default'.\n");
    expect(readStore(harness).accounts).toEqual([]);
  });

  it('logs out a chosen identity', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);

    const result = await harness.run(['auth', 'logout', '--as', 'dev']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Logged out of 'dev'.\n");
    const store = readStore(harness);
    expect(store.accounts.map((account) => account.label)).toEqual(['default']);
    expect(store.defaultLabel).toBe('default');
  });

  it('keeps an identity added while the logout waits for the revoke', async () => {
    const { backend, harness } = createWorld();
    await harness.run(loginArgs({ name: 'x', environment: 'x' }));
    await harness.run(loginArgs({ name: 'y', environment: 'y' }));
    backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });
    const other = createSharingHarness(backend, harness);
    let ran = false;

    const result = await harness.run(['auth', 'logout', '--as', 'x'], {
      fetch: async (input, init) => {
        if (!ran && requestUrl(input).endsWith('/cli/auth/revoke')) {
          ran = true;
          const added = await other.run(loginArgs({ name: 'z', environment: 'z' }));
          expect(added.code).toBe(0);
        }
        return backend.fetch(input, init);
      },
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Logged out of 'x'.\n");
    const store = readStore(harness);
    expect(store.accounts.map((account) => account.label)).toEqual(['y', 'z']);
    expect(store.accounts.map((account) => account.token)).toEqual([
      backend.issued[1]?.token,
      backend.issued[2]?.token,
    ]);
    expect(backend.revoked.has(backend.issued[0]?.token ?? '')).toBe(true);
    expectNoSecrets(store.accounts, result.stdout, result.stderr);
  });

  it('keeps a credential that replaced the label while the logout was in flight', async () => {
    const { backend, harness } = createWorld();
    await harness.run(loginArgs({ name: 'L' }));
    const other = createSharingHarness(backend, harness);
    let ran = false;

    const result = await harness.run(['auth', 'logout', '--as', 'L'], {
      fetch: async (input, init) => {
        if (!ran && requestUrl(input).endsWith('/cli/auth/revoke')) {
          ran = true;
          const relogin = await other.run(loginArgs({ name: 'L' }));
          expect(relogin.code).toBe(0);
        }
        return backend.fetch(input, init);
      },
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Logged out of 'L'.\n");
    const store = readStore(harness);
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0]?.label).toBe('L');
    expect(store.accounts[0]?.credentialId).toBe('cred_2');
    expect(store.accounts[0]?.token).toBe(backend.issued[1]?.token);
    expect(store.accounts[0]?.token).not.toBe(backend.issued[0]?.token);
    expectNoSecrets(store.accounts, result.stdout, result.stderr);
  });

  it('reports a missing login', async () => {
    const { harness } = createWorld();

    const result = await harness.run(['auth', 'logout']);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe(NOT_LOGGED_IN);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('refuses when several identities have no default', async () => {
    const { backend, harness } = createWorld();
    await signInTwo(harness, backend);
    clearDefault(harness);
    const before = readFileSync(harness.credentialsPath, 'utf8');

    const result = await harness.run(['auth', 'logout']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('--as');
    expect(readFileSync(harness.credentialsPath, 'utf8')).toBe(before);
  });
});
