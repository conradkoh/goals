import { readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { FakeBackend } from './__testing__/fakeBackend.js';
import { createFakeBackend } from './__testing__/fakeBackend.js';
import type { Harness } from './__testing__/harness.js';
import { createHarness } from './__testing__/harness.js';
import type { CredentialsFile } from './credentials.js';

const FIRST_LOGIN = [
  'auth',
  'login',
  '--webapp-url',
  'http://localhost:3000',
  '--convex-url',
  'https://example-123.convex.site',
];
const DEV_LOGIN = [
  'auth',
  'login',
  '--name',
  'dev',
  '--env',
  'dev',
  '--webapp-url',
  'http://localhost:3000',
  '--convex-url',
  'http://127.0.0.1:3211',
];

/** The fake backend's clock stays at the harness start instant. */
const backendClock = { now: Date.UTC(2026, 0, 1) };

const cleanups: (() => void)[] = [];

function createWorld(): { backend: FakeBackend; harness: Harness } {
  const backend = createFakeBackend({ now: () => backendClock.now });
  const harness = createHarness(backend);
  cleanups.push(() => {
    harness.cleanup();
  });
  return { backend, harness };
}

function readStore(harness: Harness): CredentialsFile {
  return JSON.parse(readFileSync(harness.credentialsPath, 'utf8')) as CredentialsFile;
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('goals identity lifecycle', () => {
  it('logs in, switches identity and logs out again', async () => {
    const { backend, harness } = createWorld();
    const outputs: string[] = [];

    const login = await harness.run(FIRST_LOGIN);
    outputs.push(login.stdout, login.stderr);
    expect(login.code).toBe(0);
    expect(login.stdout).toBe(
      "Logged in as Ada Lovelace (identity 'default', environment default).\n"
    );
    expect(login.stderr).toContain('Open http://localhost:3000/cli/authorize?request=');
    expect(login.stderr).toContain('Verification code: ');
    expect(login.stderr).toContain('Waiting for approval... Press Ctrl+C to cancel.\n');

    const first = readStore(harness);
    expect(first.defaultLabel).toBe('default');
    expect(first.accounts).toHaveLength(1);
    const firstAccount = first.accounts[0];
    expect(firstAccount?.webappUrl).toBe('http://localhost:3000');
    expect(firstAccount?.convexUrl).toBe('https://example-123.convex.site');
    const firstToken = firstAccount?.token ?? '';
    expect(firstToken).not.toBe('');
    expect(login.stdout).not.toContain(firstToken);
    expect(login.stderr).not.toContain(firstToken);

    if (process.platform !== 'win32') {
      expect(statSync(harness.credentialsPath).mode & 0o777).toBe(0o600);
      expect(statSync(dirname(harness.credentialsPath)).mode & 0o777).toBe(0o700);
    }

    const status = await harness.run(['auth', 'status']);
    outputs.push(status.stdout, status.stderr);
    expect(status.code).toBe(0);
    expect(status.stdout).toContain('Name:         Ada Lovelace');
    expect(status.stdout).toContain('Identity:     default');
    expect(status.stdout).toContain('Server:       example-123.convex.site');
    expect(status.stdout).toContain('Valid:        yes');

    backend.setUser({ userId: 'user_2', name: 'Grace Hopper' });
    const dev = await harness.run(DEV_LOGIN);
    outputs.push(dev.stdout, dev.stderr);
    expect(dev.code).toBe(0);
    expect(dev.stdout).toBe("Logged in as Grace Hopper (identity 'dev', environment dev).\n");
    expect(readStore(harness).defaultLabel).toBe('default');

    const list = await harness.run(['auth', 'list']);
    outputs.push(list.stdout, list.stderr);
    expect(list.code).toBe(0);
    expect(list.stdout.trimEnd().split('\n')).toHaveLength(3);
    expect(list.stdout).toContain('* default');
    expect(list.stdout).toContain('  dev');
    expect(list.stdout).toContain('127.0.0.1:3211');

    const use = await harness.run(['auth', 'use', 'dev']);
    outputs.push(use.stdout, use.stderr);
    expect(use.code).toBe(0);
    expect(use.stdout).toBe("Default identity is now 'dev'.\n");

    const devStatus = await harness.run(['auth', 'status']);
    outputs.push(devStatus.stdout, devStatus.stderr);
    expect(devStatus.code).toBe(0);
    expect(devStatus.stdout).toContain('Name:         Grace Hopper');
    expect(devStatus.stdout).toContain('Identity:     dev');
    expect(devStatus.stdout).toContain('Environment:  dev');

    const defaultStatus = await harness.run(['auth', 'status', '--as', 'default']);
    outputs.push(defaultStatus.stdout, defaultStatus.stderr);
    expect(defaultStatus.code).toBe(0);
    expect(defaultStatus.stdout).toContain('Name:         Ada Lovelace');
    expect(defaultStatus.stdout).toContain('Identity:     default');

    const logoutDev = await harness.run(['auth', 'logout', '--as', 'dev']);
    outputs.push(logoutDev.stdout, logoutDev.stderr);
    expect(logoutDev.code).toBe(0);
    expect(logoutDev.stdout).toBe("Logged out of 'dev'.\n");
    expect(readStore(harness).accounts.map((account) => account.label)).toEqual(['default']);

    const afterDev = await harness.run(['auth', 'list']);
    outputs.push(afterDev.stdout, afterDev.stderr);
    expect(afterDev.code).toBe(0);
    expect(afterDev.stdout.trimEnd().split('\n')).toHaveLength(2);
    expect(afterDev.stdout).toContain('* default');

    const logout = await harness.run(['auth', 'logout']);
    outputs.push(logout.stdout, logout.stderr);
    expect(logout.code).toBe(0);
    expect(logout.stdout).toBe("Logged out of 'default'.\n");
    expect(readStore(harness).accounts).toEqual([]);

    const missing = await harness.run(['auth', 'status']);
    outputs.push(missing.stdout, missing.stderr);
    expect(missing.code).toBe(1);
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toBe('Not logged in; run `goals auth login`.\n');

    for (const issued of backend.issued) {
      for (const secret of [issued.token, issued.deviceCode]) {
        if (secret === '') continue;
        for (const output of outputs) expect(output).not.toContain(secret);
      }
    }
  });
});
