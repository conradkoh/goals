import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend, FakeBackendOptions } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';
import type { CredentialsFile } from '../credentials.js';
import { validateCredentials } from '../credentials.js';

const WEBAPP = 'http://localhost:3000';
const CONVEX = 'http://127.0.0.1:3211';
const LOGIN = ['auth', 'login', '--webapp-url', `${WEBAPP}/`, '--convex-url', `${CONVEX}/`];

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

/** A second CLI process wired to the same backend and the same credential file. */
function createSharingHarness(backend: FakeBackend, source: Harness): Harness {
  const harness = createHarness(backend, { storeOptions: { filePath: source.credentialsPath } });
  cleanups.push(() => {
    harness.cleanup();
  });
  return harness;
}

function readStore(harness: Harness): CredentialsFile {
  return JSON.parse(readFileSync(harness.credentialsPath, 'utf8')) as CredentialsFile;
}

function createRequestBody(backend: FakeBackend): Record<string, unknown> {
  const recorded = backend.requests.find((request) => request.url.endsWith('/cli/auth/requests'));
  return recorded?.body as Record<string, unknown>;
}

function secrets(backend: FakeBackend): string[] {
  return backend.issued
    .flatMap(({ token, deviceCode }) => [token, deviceCode])
    .filter((secret) => secret !== '');
}

function expectNoSecrets(backend: FakeBackend, ...outputs: string[]): void {
  for (const secret of secrets(backend)) {
    for (const output of outputs) {
      expect(output).not.toContain(secret);
    }
  }
}

function expectIso(value: string | undefined): void {
  expect(value).toBeTruthy();
  const text = value ?? '';
  expect(new Date(text).toISOString()).toBe(text);
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals auth login', () => {
  it('walks the browser flow and stores the credential', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run(LOGIN);

    const request = backend.created[0];
    expect(backend.created).toHaveLength(1);
    expect(request).toBeDefined();
    expect(result.code).toBe(0);
    const authorizeUrl = `${WEBAPP}/cli/authorize?request=${request?.requestId ?? ''}`;
    expect(result.stderr).toBe(
      `Open ${authorizeUrl}\nVerification code: ${request?.userCode ?? ''}\nWaiting for approval... Press Ctrl+C to cancel.\n`
    );
    expect(result.stdout).toBe(
      "Logged in as Ada Lovelace (identity 'default', environment default).\n"
    );
    expect(harness.sleeps).toEqual([2000]);
    expect(harness.browserUrls).toEqual([authorizeUrl]);

    const store = readStore(harness);
    expect(store.defaultLabel).toBe('default');
    expect(store.accounts).toHaveLength(1);
    const account = store.accounts[0];
    expect(account).toBeDefined();
    expect(account?.label).toBe('default');
    expect(account?.userId).toBe('user_1');
    expect(account?.name).toBe('Ada Lovelace');
    expect(account?.environment).toBeUndefined();
    expect(account?.webappUrl).toBe(WEBAPP);
    expect(account?.convexUrl).toBe(CONVEX);
    expect(account?.credentialId).toBe('cred_1');
    expect(account?.token).not.toBe('');
    expectIso(account?.createdAt);
    expectIso(account?.expiresAt);
    expect(Date.parse(account?.expiresAt ?? '')).toBeGreaterThan(
      Date.parse(account?.createdAt ?? '')
    );

    if (process.platform !== 'win32') {
      expect(statSync(harness.credentialsPath).mode & 0o777).toBe(0o600);
      expect(statSync(dirname(harness.credentialsPath)).mode & 0o777).toBe(0o700);
    }

    expect(createRequestBody(backend)).toEqual({
      installationId: store.installationId,
      machineName: 'test-host',
    });
    expectNoSecrets(backend, result.stdout, result.stderr);
  });

  it('polls twice when the backend stays pending', async () => {
    const { harness } = createWorld({ pendingPolls: 2 });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(0);
    expect(harness.sleeps).toEqual([2000, 2000]);
  });

  it('clamps the poll interval to the documented bounds', async () => {
    const { harness } = createWorld({ pendingPolls: 1, intervalMs: 5 });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(0);
    expect(harness.sleeps).toEqual([100]);
  });

  it('records the environment qualifier and uses it as the label', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run([...LOGIN, '--env', 'Dev']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Logged in as Ada Lovelace (identity 'dev', environment dev).\n");
    const account = readStore(harness).accounts[0];
    expect(account?.label).toBe('dev');
    expect(account?.environment).toBe('dev');
    expect(createRequestBody(backend)).toEqual({
      installationId: readStore(harness).installationId,
      machineName: 'test-host',
      environment: 'dev',
    });
  });

  it('names the identity with --name', async () => {
    const { harness } = createWorld();

    const result = await harness.run([...LOGIN, '--name', 'work']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Logged in as Ada Lovelace (identity 'work', environment default).\n"
    );
    expect(readStore(harness).accounts[0]?.label).toBe('work');
  });

  it.each([
    ['deny', 'Login denied; run the command again.'],
    ['expire', 'Login expired; run the command again.'],
    ['consume', 'Login request was already used; run the command again.'],
    ['not_found', 'Login request not found; run the command again.'],
  ] as const)('reports a %s outcome without writing a file', async (outcome, message) => {
    const { backend, harness } = createWorld({ outcome });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.endsWith(`${message}\n`)).toBe(true);
    expect(existsSync(harness.credentialsPath)).toBe(false);
    expectNoSecrets(backend, result.stdout, result.stderr);
  });

  it('expires when the clock passes the request deadline', async () => {
    const { harness } = createWorld({ pendingPolls: 1000, requestTtlMs: 1500 });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(1);
    expect(result.stderr.endsWith('Login expired; run the command again.\n')).toBe(true);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('cancels on SIGINT', async () => {
    const { harness } = createWorld();
    let triggered = false;

    const result = await harness.run(LOGIN, {
      sleep: () => {
        if (!triggered) {
          triggered = true;
          harness.sigint.trigger();
        }
        return Promise.resolve();
      },
    });

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.endsWith('Login cancelled\n')).toBe(true);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('succeeds even when the browser cannot be opened', async () => {
    const { harness } = createWorld();

    const result = await harness.run(LOGIN, {
      openBrowser: () => Promise.reject(new Error('no browser here')),
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Logged in as Ada Lovelace (identity 'default', environment default).\n"
    );
    expect(readStore(harness).accounts).toHaveLength(1);
  });

  it('reports rate limiting', async () => {
    const { harness } = createWorld({ createStatus: 429 });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Too many login attempts; wait a minute and retry.\n');
    expect(result.stdout).toBe('');
  });

  it('reports a network failure', async () => {
    const { harness } = createWorld({ failNetwork: true });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Unable to contact Goals; please retry.\n');
    expect(result.stdout).toBe('');
  });

  it('replaces only the entry of the same identity', async () => {
    const { harness } = createWorld({ pendingPolls: 0 });

    await harness.run(LOGIN);
    await harness.run([...LOGIN, '--name', 'dev', '--env', 'dev']);
    const before = readStore(harness);
    const firstToken = before.accounts[0]?.token;
    const devToken = before.accounts[1]?.token;

    const result = await harness.run(LOGIN);

    const store = readStore(harness);
    expect(result.code).toBe(0);
    expect(store.accounts.map((account) => account.label)).toEqual(['default', 'dev']);
    expect(store.accounts[0]?.token).not.toBe(firstToken);
    expect(store.accounts[1]?.token).toBe(devToken);
    expect(store.defaultLabel).toBe('default');
  });

  it('appends another identity without changing the default', async () => {
    const { harness } = createWorld({ pendingPolls: 0 });

    await harness.run(LOGIN);
    const result = await harness.run([...LOGIN, '--name', 'dev', '--env', 'dev']);

    const store = readStore(harness);
    expect(result.code).toBe(0);
    expect(store.accounts.map((account) => account.label)).toEqual(['default', 'dev']);
    expect(store.defaultLabel).toBe('default');
  });

  it('keeps an identity added while another login waits for approval', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 1 });
    const other = createSharingHarness(backend, harness);

    const result = await harness.run([...LOGIN, '--name', 'a'], {
      sleep: async () => {
        backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });
        const second = await other.run([...LOGIN, '--name', 'b']);
        expect(second.code).toBe(0);
        backend.setUser({ userId: 'user_1', name: 'Ada Lovelace' });
      },
    });

    expect(result.code).toBe(0);
    const store = readStore(harness);
    expect(store.accounts.map((account) => account.label)).toEqual(['b', 'a']);
    expect(store.accounts.map((account) => account.userId)).toEqual(['user_2', 'user_1']);
    expect(store.accounts.map((account) => account.token)).toEqual([
      backend.issued[1]?.token,
      backend.issued[0]?.token,
    ]);
    expect(store.defaultLabel).toBe('b');
    expect(() => validateCredentials(store)).not.toThrow();
    expectNoSecrets(backend, result.stdout, result.stderr);
  });

  it('rejects a label taken while the login waited and revokes the fresh token', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 1 });
    const other = createSharingHarness(backend, harness);

    const result = await harness.run([...LOGIN, '--name', 'shared'], {
      sleep: async () => {
        backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });
        const second = await other.run([...LOGIN, '--name', 'shared']);
        expect(second.code).toBe(0);
        backend.setUser({ userId: 'user_1', name: 'Ada Lovelace' });
      },
    });

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      "identity label 'shared' is already used by another account; pass --name shared to choose a different one"
    );
    const store = readStore(harness);
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0]?.label).toBe('shared');
    expect(store.accounts[0]?.userId).toBe('user_2');
    expect(store.accounts[0]?.token).toBe(backend.issued[1]?.token);
    expect(backend.revoked.has(backend.issued[0]?.token ?? '')).toBe(true);
    expectNoSecrets(backend, result.stdout, result.stderr);
  });

  it('rejects a label collision after approval and revokes the new token', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 0 });

    await harness.run(LOGIN);
    const before = readFileSync(harness.credentialsPath, 'utf8');
    backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(2);
    expect(result.stderr.trimEnd().split('\n').at(-1)?.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--name');
    expect(readFileSync(harness.credentialsPath, 'utf8')).toBe(before);
    const secondToken = backend.issued[1]?.token ?? '';
    expect(secondToken).not.toBe('');
    expect(backend.revoked.has(secondToken)).toBe(true);
  });

  it('rejects a label collision before any request is made', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 0 });

    await harness.run(LOGIN);
    const before = readFileSync(harness.credentialsPath, 'utf8');
    const requests = backend.requests.length;

    const result = await harness.run([
      ...LOGIN,
      '--name',
      'default',
      '--convex-url',
      'http://127.0.0.1:3212',
    ]);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--name');
    expect(backend.requests).toHaveLength(requests);
    expect(readFileSync(harness.credentialsPath, 'utf8')).toBe(before);
  });

  it('revokes the fresh token when the credential cannot be written', async () => {
    const { backend, harness } = createWorld({ pendingPolls: 0 });
    mkdirSync(join(harness.dir, 'config'), { recursive: true });
    symlinkSync(join(harness.dir, 'missing-target'), join(harness.dir, 'config', 'goals'));

    const result = await harness.run(LOGIN);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    const token = backend.issued[0]?.token ?? '';
    expect(token).not.toBe('');
    expect(backend.revoked.has(token)).toBe(true);
  });

  it('rejects a malformed --name before touching the disk', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run([...LOGIN, '--name', 'bad label!']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--name must be 1-64 characters');
    expect(backend.requests).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });

  it('rejects an invalid environment qualifier', async () => {
    const { backend, harness } = createWorld();

    const result = await harness.run([...LOGIN, '--env', 'not a qualifier']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: ')).toBe(true);
    expect(result.stderr).toContain('--env');
    expect(backend.requests).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
  });
});
