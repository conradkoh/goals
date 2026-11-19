/**
 * Tests for the browser-facing CLI approval and credential functions.
 *
 * The seam is the public `api.cli.auth.*` surface plus the internal state
 * machine, through a real convex-test database. The suite proves that any
 * browser sign-in method can approve a request, that a CLI handle can approve
 * nothing, and that no secret (user code, hashes, installation id) reaches the
 * browser.
 */

import type { SessionId } from 'convex-helpers/server/sessions';
import type { TestConvex } from 'convex-test';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { deriveSessionHandle, generateToken, hashHandle } from '../../modules/cli/tokenCrypto';
import { modules } from '../../test.setup';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const NOW = 1_800_000_000_000;
const ONE_MINUTE = 60_000;
const ONE_DAY = 86_400_000;

const DEVICE_CODE_HASH = '0123456789abcdef'.repeat(4);
const CANDIDATE_HANDLE_HASH = 'abcdef0123456789'.repeat(4);
const USER_CODE = '123456';
const INSTALLATION_ID = '11111111-1111-4111-8111-111111111111';

const mockFlags = vi.hoisted(() => ({ disableLogin: false }));

vi.mock('../../config/featureFlags', () => ({
  featureFlags: {
    get disableLogin() {
      return mockFlags.disableLogin;
    },
    allowedSignupMethods: ['self'],
  },
}));

interface RequestOverrides {
  requestId?: string;
  status?: 'pending' | 'approved' | 'denied' | 'consumed';
  expiresAt?: number;
  approvedByUserId?: Id<'users'>;
  resolvedAt?: number;
  codeAttempts?: number;
  environment?: string;
}

async function seedRequest(
  overrides: RequestOverrides = {}
): Promise<{ id: Id<'cliAuthRequests'>; requestId: string }> {
  const requestId = overrides.requestId ?? crypto.randomUUID();
  const id = await t.run((ctx) =>
    ctx.db.insert('cliAuthRequests', {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      userCode: USER_CODE,
      installationId: INSTALLATION_ID,
      machineName: 'macbook-pro',
      environment: overrides.environment,
      status: overrides.status ?? 'pending',
      createdAt: NOW,
      expiresAt: overrides.expiresAt ?? NOW + 10 * ONE_MINUTE,
      approvedByUserId: overrides.approvedByUserId,
      resolvedAt: overrides.resolvedAt,
      codeAttempts: overrides.codeAttempts ?? 0,
    })
  );
  return { id, requestId };
}

async function seedFullUser(name = 'Alice', email = 'alice@example.com'): Promise<Id<'users'>> {
  return t.run((ctx) => ctx.db.insert('users', { type: 'full', name, email }));
}

async function seedBrowserSession(sessionId: SessionId, userId: Id<'users'>): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('sessions', {
      sessionId,
      userId,
      createdAt: NOW,
      authMethod: 'anonymous',
    })
  );
}

async function newBrowserSession(userId: Id<'users'>): Promise<SessionId> {
  const sessionId = `browser-${crypto.randomUUID()}` as SessionId;
  await seedBrowserSession(sessionId, userId);
  return sessionId;
}

interface CredentialOverrides {
  handleHash?: string;
  installationId?: string;
  machineName?: string;
  environment?: string;
  createdAt?: number;
  expiresAt?: number;
  lastUsedAt?: number;
  revokedAt?: number;
  revokedReason?: 'user' | 'logout' | 'replaced' | 'limit';
}

async function seedCredential(
  userId: Id<'users'>,
  overrides: CredentialOverrides = {}
): Promise<Id<'cliCredentials'>> {
  return t.run((ctx) =>
    ctx.db.insert('cliCredentials', {
      userId,
      handleHash: overrides.handleHash ?? CANDIDATE_HANDLE_HASH,
      installationId: overrides.installationId ?? INSTALLATION_ID,
      machineName: overrides.machineName ?? 'macbook-pro',
      environment: overrides.environment,
      createdAt: overrides.createdAt ?? NOW,
      expiresAt: overrides.expiresAt ?? NOW + 180 * ONE_DAY,
      lastUsedAt: overrides.lastUsedAt,
      revokedAt: overrides.revokedAt,
      revokedReason: overrides.revokedReason,
    })
  );
}

const NOT_AUTHENTICATED = { data: { code: 'NOT_AUTHENTICATED' } };

// A fresh convex-test instance per test keeps the rate-limit and ordering
// assertions independent of earlier tests in this file.
let t: TestConvex<typeof schema>;

beforeEach(() => {
  t = convexTest(schema, modules);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  mockFlags.disableLogin = false;
});

afterEach(() => {
  vi.useRealTimers();
  mockFlags.disableLogin = false;
});

describe('getAuthorizationRequest', () => {
  test('returns only the browser-safe request view', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest({ environment: 'production' });

    const result = await t.query(api.cli.auth.getAuthorizationRequest, {
      sessionId,
      requestId,
    });

    expect(result).toEqual({
      status: 'pending',
      machineName: 'macbook-pro',
      environment: 'production',
      createdAt: NOW,
      expiresAt: NOW + 600_000,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(USER_CODE);
    expect(serialized).not.toContain(DEVICE_CODE_HASH);
    expect(serialized).not.toContain(INSTALLATION_ID);
  });

  test('reports not_found for an unknown request id', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);

    await expect(
      t.query(api.cli.auth.getAuthorizationRequest, { sessionId, requestId: 'missing' })
    ).resolves.toEqual({ status: 'not_found' });
  });

  test('reports expired once the request has expired', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest({ expiresAt: NOW });

    const result = await t.query(api.cli.auth.getAuthorizationRequest, {
      sessionId,
      requestId,
    });

    expect(result.status).toBe('expired');
  });

  test('rejects an unauthenticated browser session', async () => {
    const { requestId } = await seedRequest();

    await expect(
      t.query(api.cli.auth.getAuthorizationRequest, {
        sessionId: 'no-such-session' as SessionId,
        requestId,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
  });
});

describe('approveAuthorizationRequest', () => {
  test('approves with the typed code, tolerating surrounding whitespace', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { id, requestId } = await seedRequest();

    const result = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: ' 123 456 ',
    });

    expect(result).toEqual({ success: true });
    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.status).toBe('approved');
    expect(row?.approvedByUserId).toBe(user);
  });

  test('is idempotent for the same approver', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest();

    const first = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: USER_CODE,
    });
    const second = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: USER_CODE,
    });

    expect(first).toEqual({ success: true });
    expect(second).toEqual({ success: true });
  });

  test('reports already_resolved for a different user after approval', async () => {
    const approver = await seedFullUser('Alice');
    const other = await seedFullUser('Bob', 'bob@example.com');
    const approverSession = await newBrowserSession(approver);
    const otherSession = await newBrowserSession(other);
    const { requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: approver,
    });

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId: otherSession,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: false, reason: 'already_resolved' });
    // Sanity: the original approver can still re-approve.
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId: approverSession,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: true });
  });

  test('counts a wrong code as an attempt', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { id, requestId } = await seedRequest();

    const result = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: '000000',
    });

    expect(result).toEqual({ success: false, reason: 'code_mismatch' });
    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.codeAttempts).toBe(1);
    expect(row?.status).toBe('pending');
  });

  test('denies the request on the fifth wrong code and locks it afterwards', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { id, requestId } = await seedRequest();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        t.mutation(api.cli.auth.approveAuthorizationRequest, {
          sessionId,
          requestId,
          userCode: '000000',
        })
      ).resolves.toEqual({ success: false, reason: 'code_mismatch' });
    }
    const fifth = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: '000000',
    });
    expect(fifth).toEqual({ success: false, reason: 'too_many_attempts' });

    const deniedRow = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(deniedRow?.status).toBe('denied');
    expect(deniedRow?.codeAttempts).toBe(5);

    const correctAfterLockout = await t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId,
      requestId,
      userCode: USER_CODE,
    });
    expect(correctAfterLockout).toEqual({ success: false, reason: 'already_resolved' });
    const rowAfter = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(rowAfter?.status).toBe('denied');
  });

  test('reports expired and does not approve', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { id, requestId } = await seedRequest({ expiresAt: NOW });

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: false, reason: 'expired' });
    expect((await t.run((ctx) => ctx.db.get('cliAuthRequests', id)))?.status).toBe('pending');
  });

  test('reports not_found for an unknown request id', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId: 'missing',
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: false, reason: 'not_found' });
  });

  test('reports login_disabled when the feature flag is on', async () => {
    mockFlags.disableLogin = true;
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest();

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: false, reason: 'login_disabled' });
  });

  test('rejects an unauthenticated browser session', async () => {
    const { requestId } = await seedRequest();

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId: 'no-such-session' as SessionId,
        requestId,
        userCode: USER_CODE,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
  });
});

describe('full CLI login flow', () => {
  test('create, approve, poll, use and revoke', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const token = generateToken();
    const requestId = crypto.randomUUID();

    const created = await t.mutation(internal.cli.authInternal.createRequest, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      userCode: USER_CODE,
      installationId: INSTALLATION_ID,
      machineName: 'macbook-pro',
      environment: 'production',
    });
    expect(created).toEqual({ ok: true, expiresAt: NOW + 600_000 });

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: true });

    const handle = await deriveSessionHandle(token);
    const polled = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: await hashHandle(handle),
    });
    expect(polled.status).toBe('approved');
    if (polled.status !== 'approved') throw new Error('expected approval');

    await expect(
      t.query(api.domain.getDomains, { sessionId: handle as SessionId })
    ).resolves.toEqual([]);

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, {
        sessionId,
        credentialId: polled.credentialId,
      })
    ).resolves.toEqual({ success: true });

    await expect(
      t.query(api.domain.getDomains, { sessionId: handle as SessionId })
    ).rejects.toThrow('Login required');
  });

  test('an anonymous sign-in method can approve a request', async () => {
    const sessionId = `anon-${crypto.randomUUID()}` as SessionId;
    const login = await t.mutation(api.auth.loginAnon, { sessionId });
    expect(login.success).toBe(true);

    const { id, requestId } = await seedRequest();
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId,
        userCode: USER_CODE,
      })
    ).resolves.toEqual({ success: true });

    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.approvedByUserId).toBe(login.userId);
  });
});

describe('denyAuthorizationRequest', () => {
  test('denies a pending request and the CLI poll sees denied', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { id, requestId } = await seedRequest();

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId, requestId })
    ).resolves.toEqual({ success: true });
    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.status).toBe('denied');
    expect(row?.resolvedAt).toBe(NOW);

    await expect(
      t.mutation(internal.cli.authInternal.pollOrConsume, {
        requestId,
        deviceCodeHash: DEVICE_CODE_HASH,
        candidateHandleHash: CANDIDATE_HANDLE_HASH,
      })
    ).resolves.toEqual({ status: 'denied' });
  });

  test('reports already_resolved after approval', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
    });

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId, requestId })
    ).resolves.toEqual({ success: false, reason: 'already_resolved' });
  });

  test('reports expired', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { requestId } = await seedRequest({ expiresAt: NOW });

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId, requestId })
    ).resolves.toEqual({ success: false, reason: 'expired' });
  });

  test('reports not_found for an unknown request id', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId, requestId: 'missing' })
    ).resolves.toEqual({ success: false, reason: 'not_found' });
  });

  test('rejects an unauthenticated browser session', async () => {
    const { requestId } = await seedRequest();

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, {
        sessionId: 'no-such-session' as SessionId,
        requestId,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
  });
});

describe('listMyCliCredentials', () => {
  test('lists only the caller credentials newest first, excluding revoked', async () => {
    const user = await seedFullUser('Alice');
    const other = await seedFullUser('Bob', 'bob@example.com');
    const sessionId = await newBrowserSession(user);

    const oldest = await seedCredential(user, {
      handleHash: 'oldest-hash',
      installationId: 'install-oldest',
      machineName: 'oldest-machine',
      createdAt: NOW - 2 * ONE_DAY,
    });
    const expired = await seedCredential(user, {
      handleHash: 'expired-hash',
      installationId: 'install-expired',
      machineName: 'expired-machine',
      createdAt: NOW - ONE_DAY,
      expiresAt: NOW,
    });
    const newest = await seedCredential(user, {
      handleHash: 'newest-hash',
      installationId: 'install-newest',
      machineName: 'newest-machine',
      createdAt: NOW - ONE_MINUTE,
      lastUsedAt: NOW - ONE_MINUTE,
    });
    await seedCredential(user, {
      handleHash: 'revoked-hash',
      installationId: 'install-revoked',
      machineName: 'revoked-machine',
      revokedAt: NOW - ONE_MINUTE,
      revokedReason: 'user',
    });
    await seedCredential(other, {
      handleHash: 'other-hash',
      installationId: 'install-other',
      machineName: 'other-machine',
    });

    const result = await t.query(api.cli.auth.listMyCliCredentials, { sessionId });

    expect(result.map((credential) => credential.id)).toEqual([newest, expired, oldest]);
    expect(result.map((credential) => credential.machineName)).toEqual([
      'newest-machine',
      'expired-machine',
      'oldest-machine',
    ]);
    expect(result.find((credential) => credential.id === expired)?.expired).toBe(true);
    expect(result.find((credential) => credential.id === newest)?.expired).toBe(false);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('hash');
    expect(serialized).not.toContain('install-');
    expect(serialized).not.toContain('cli_');
  });

  test('rejects an unauthenticated browser session', async () => {
    await expect(
      t.query(api.cli.auth.listMyCliCredentials, {
        sessionId: 'no-such-session' as SessionId,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
  });
});

describe('revokeCliCredential', () => {
  test('the owner revokes once, and repeats succeed without rewriting', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const credentialId = await seedCredential(user);

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, { sessionId, credentialId })
    ).resolves.toEqual({ success: true });
    const row = await t.run((ctx) => ctx.db.get('cliCredentials', credentialId));
    expect(row?.revokedAt).toBe(NOW);
    expect(row?.revokedReason).toBe('user');

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, { sessionId, credentialId })
    ).resolves.toEqual({ success: true });
    const again = await t.run((ctx) => ctx.db.get('cliCredentials', credentialId));
    expect(again?.revokedAt).toBe(NOW);
  });

  test('another user cannot revoke it', async () => {
    const owner = await seedFullUser('Alice');
    const other = await seedFullUser('Bob', 'bob@example.com');
    const otherSession = await newBrowserSession(other);
    const credentialId = await seedCredential(owner);

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, {
        sessionId: otherSession,
        credentialId,
      })
    ).resolves.toEqual({ success: false, reason: 'not_found' });
    const row = await t.run((ctx) => ctx.db.get('cliCredentials', credentialId));
    expect(row?.revokedAt).toBeUndefined();
  });

  test('reports not_found for a removed credential', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const credentialId = await seedCredential(user);
    await t.run((ctx) => ctx.db.delete('cliCredentials', credentialId));

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, { sessionId, credentialId })
    ).resolves.toEqual({ success: false, reason: 'not_found' });
  });

  test('rejects an unauthenticated browser session', async () => {
    const owner = await seedFullUser();
    const credentialId = await seedCredential(owner);

    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, {
        sessionId: 'no-such-session' as SessionId,
        credentialId,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
  });
});

describe('CLI handles on the browser-facing surface', () => {
  test('every api.cli.auth function rejects a valid CLI handle', async () => {
    const user = await seedFullUser();
    const handle = await deriveSessionHandle(generateToken());
    const credentialId = await seedCredential(user, {
      handleHash: await hashHandle(handle),
    });
    const requestId = crypto.randomUUID();
    const { id } = await seedRequest({ requestId });
    const cliSession = handle as SessionId;

    await expect(
      t.query(api.cli.auth.getAuthorizationRequest, { sessionId: cliSession, requestId })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId: cliSession,
        requestId,
        userCode: USER_CODE,
      })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId: cliSession, requestId })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
    await expect(
      t.query(api.cli.auth.listMyCliCredentials, { sessionId: cliSession })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);
    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, { sessionId: cliSession, credentialId })
    ).rejects.toMatchObject(NOT_AUTHENTICATED);

    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.status).toBe('pending');
    expect(row?.codeAttempts).toBe(0);
  });
});
