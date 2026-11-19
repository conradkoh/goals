/**
 * End-to-end tests for the CLI device-code HTTP surface.
 *
 * The seam is `t.fetch`, which drives the real `httpRouter` in `convex/http.ts`
 * and the real Convex functions, so routing, framing, status mapping, caps,
 * replay protection and secret hygiene are all exercised through the public
 * wire contract. The only substituted collaborator is the `featureFlags`
 * config module (the login-disabled case).
 *
 * Every assertion uses literal statuses, TTLs and limits from the contract
 * rather than importing the production formulas, so a formula change cannot
 * silently rewrite the expected protocol.
 */

import type { SessionId } from 'convex-helpers/server/sessions';
import type { TestConvex } from 'convex-test';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { deriveSessionHandle } from '../../modules/cli/tokenCrypto';
import { modules } from '../../test.setup';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const NOW = 1_800_000_000_000;
const ONE_MINUTE = 60_000;
const REQUEST_TTL_MS = 10 * ONE_MINUTE;
const CREDENTIAL_TTL_MS = 180 * 24 * 3_600_000;

const mockFlags = vi.hoisted(() => ({ disableLogin: false }));

vi.mock('../../config/featureFlags', () => ({
  featureFlags: {
    get disableLogin() {
      return mockFlags.disableLogin;
    },
    allowedSignupMethods: ['self'],
  },
}));

let t: TestConvex<typeof schema>;
/** Every response body body returned through `post` during the current test. */
let responses: string[];

interface HttpResult {
  status: number;
  headers: Headers;
  json: any;
  text: string;
}

/** Posts to a CLI route and asserts the response is never cacheable. */
async function post(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<HttpResult> {
  const mergedHeaders: Record<string, string> =
    body === undefined ? { ...headers } : { 'content-type': 'application/json', ...headers };
  const init: RequestInit = { method: 'POST', headers: mergedHeaders };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);

  const response = await t.fetch(path, init);
  const text = await response.text();
  responses.push(text);
  expect(response.headers.get('cache-control')).toBe('no-store');

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, json, text };
}

/** A fresh installation id (UUID v4 shape). */
function newInstallationId(): string {
  return crypto.randomUUID();
}

async function seedFullUser(name = 'Alice', email = 'alice@example.com'): Promise<Id<'users'>> {
  return t.run((ctx) => ctx.db.insert('users', { type: 'full', name, email }));
}

async function newBrowserSession(userId: Id<'users'>): Promise<SessionId> {
  const sessionId = `browser-${crypto.randomUUID()}` as SessionId;
  await t.run((ctx) =>
    ctx.db.insert('sessions', {
      sessionId,
      userId,
      createdAt: NOW,
      authMethod: 'anonymous',
    })
  );
  return sessionId;
}

/** Seeds `count` unexpired pending requests, each from its own installation. */
async function seedPendingRequests(count: number): Promise<void> {
  await t.run(async (ctx) => {
    for (let index = 0; index < count; index += 1) {
      await ctx.db.insert('cliAuthRequests', {
        requestId: crypto.randomUUID(),
        deviceCodeHash: `${index}`.padStart(64, '0'),
        userCode: '111111',
        installationId: `seed-installation-${index}`,
        machineName: 'seed-machine',
        status: 'pending',
        createdAt: NOW,
        expiresAt: NOW + REQUEST_TTL_MS,
        codeAttempts: 0,
      });
    }
  });
}

interface LoginOptions {
  sessionId: SessionId;
  installationId?: string;
  machineName?: string;
  environment?: string;
}

interface LoginResult {
  token: string;
  handle: string;
  credentialId: string;
  expiresAt: number;
  requestId: string;
  deviceCode: string;
  userCode: string;
}

/** Drives create → approve → poll and returns the issued credential. */
async function login(options: LoginOptions): Promise<LoginResult> {
  const body: Record<string, unknown> = {
    installationId: options.installationId ?? newInstallationId(),
    machineName: options.machineName ?? 'macbook-pro',
  };
  if (options.environment !== undefined) body.environment = options.environment;

  const created = await post('/cli/auth/requests', body);
  expect(created.status).toBe(201);
  const requestId = created.json.requestId as string;
  const deviceCode = created.json.deviceCode as string;
  const userCode = created.json.userCode as string;

  await expect(
    t.mutation(api.cli.auth.approveAuthorizationRequest, {
      sessionId: options.sessionId,
      requestId,
      userCode,
    })
  ).resolves.toEqual({ success: true });

  const exchanged = await post('/cli/auth/token', { requestId, deviceCode });
  expect(exchanged.status).toBe(200);
  expect(exchanged.json.status).toBe('approved');

  const token = exchanged.json.token as string;
  return {
    token,
    handle: await deriveSessionHandle(token),
    credentialId: exchanged.json.tokenId as string,
    expiresAt: exchanged.json.expiresAt as number,
    requestId,
    deviceCode,
    userCode,
  };
}

/** Lists the domains visible to a CLI handle. */
async function domainsFor(handle: string) {
  return t.query(api.domain.getDomains, { sessionId: handle as SessionId });
}

/** Asserts the handle no longer authenticates. */
async function expectLoginRequired(handle: string): Promise<void> {
  await expect(domainsFor(handle)).rejects.toThrow('Login required');
}

/** Finds the stored login request row by its public id. */
async function findRequestRow(requestId: string) {
  return t.run((ctx) =>
    ctx.db
      .query('cliAuthRequests')
      .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
      .first()
  );
}

beforeEach(() => {
  t = convexTest(schema, modules);
  responses = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  mockFlags.disableLogin = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mockFlags.disableLogin = false;
});

describe('scripted end-to-end login', () => {
  test('creates, approves, exchanges, calls, revokes and rejects', async () => {
    const user = await seedFullUser('Alice', 'alice@example.com');
    const sessionId = await newBrowserSession(user);
    const installationId = newInstallationId();

    // 1. Create: the device code is returned exactly here.
    const created = await post('/cli/auth/requests', {
      installationId,
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    expect(Object.keys(created.json).sort()).toEqual([
      'deviceCode',
      'expiresAt',
      'intervalMs',
      'requestId',
      'userCode',
    ]);
    expect(created.json.intervalMs).toBe(2000);
    expect(created.json.expiresAt).toBe(NOW + 600_000);
    expect(created.json.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.json.deviceCode).toMatch(/^[0-9a-f]{64}$/);
    expect(created.json.userCode).toMatch(/^[1-9]\d{5}$/);

    const { requestId, deviceCode, userCode } = created.json as {
      requestId: string;
      deviceCode: string;
      userCode: string;
    };

    // 2. Pending poll.
    const pending = await post('/cli/auth/token', { requestId, deviceCode });
    expect(pending.status).toBe(202);
    expect(pending.json).toEqual({ status: 'pending', intervalMs: 2000 });

    // 3. Browser approval with the typed code.
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, { sessionId, requestId, userCode })
    ).resolves.toEqual({ success: true });

    // 4. Token exchange: the only response that ever carries the bearer token.
    const exchanged = await post('/cli/auth/token', { requestId, deviceCode });
    expect(exchanged.status).toBe(200);
    expect(exchanged.json.status).toBe('approved');
    expect(exchanged.json.token).toMatch(/^gcl_[A-Za-z0-9_-]{43}$/);
    expect(typeof exchanged.json.tokenId).toBe('string');
    expect(exchanged.json.expiresAt).toBe(NOW + CREDENTIAL_TTL_MS);
    expect(exchanged.json.account).toEqual({
      userId: user,
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(Object.keys(exchanged.json).sort()).toEqual([
      'account',
      'expiresAt',
      'status',
      'token',
      'tokenId',
    ]);
    expect(Object.keys(exchanged.json.account).sort()).toEqual(['email', 'name', 'userId']);

    // 5. Replay is consumed, not re-issued.
    const replay = await post('/cli/auth/token', { requestId, deviceCode });
    expect(replay.status).toBe(410);
    expect(replay.json).toEqual({ status: 'consumed' });

    // 6. The token resolves through requireLogin for ordinary app calls.
    const handle = await deriveSessionHandle(exchanged.json.token as string);
    const domainId = await t.mutation(api.domain.createDomain, {
      sessionId: handle as SessionId,
      name: 'Work',
    });
    const domains = await domainsFor(handle);
    expect(domains.map((domain) => domain._id)).toEqual([domainId]);
    expect(domains.map((domain) => domain.name)).toEqual(['Work']);

    // 7. Logout revokes the credential.
    const revoked = await post('/cli/auth/revoke', undefined, {
      authorization: `Bearer ${exchanged.json.token}`,
    });
    expect(revoked.status).toBe(200);
    expect(revoked.json).toEqual({ revoked: true });
    await expectLoginRequired(handle);

    // 8. A repeat logout is 401 (the CLI treats it as already revoked).
    const again = await post('/cli/auth/revoke', undefined, {
      authorization: `Bearer ${exchanged.json.token}`,
    });
    expect(again.status).toBe(401);

    // 9. Browser-side revocation of an already-revoked row stays idempotent.
    await expect(
      t.mutation(api.cli.auth.revokeCliCredential, {
        sessionId,
        credentialId: exchanged.json.tokenId as Id<'cliCredentials'>,
      })
    ).resolves.toEqual({ success: true });
  });
});

describe('storage hygiene', () => {
  test('stores only hashes and never the raw secrets', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const login1 = await login({ sessionId });

    const requests = await t.run((ctx) => ctx.db.query('cliAuthRequests').collect());
    const credentials = await t.run((ctx) => ctx.db.query('cliCredentials').collect());

    const serialized = JSON.stringify({ requests, credentials });
    expect(serialized).not.toContain(login1.deviceCode);
    expect(serialized).not.toContain(login1.token);
    expect(serialized).not.toContain(login1.handle);

    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toHaveProperty('deviceCode');
    expect(requests[0].deviceCodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(requests[0].deviceCodeHash).not.toBe(login1.deviceCode);

    expect(credentials).toHaveLength(1);
    expect(credentials[0].handleHash).toMatch(/^[0-9a-f]{64}$/);
    expect(credentials[0].handleHash).not.toBe(login1.handle);
  });
});

describe('denial and expiry', () => {
  test('a denied request polls as 403 denied', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const { requestId, deviceCode } = created.json as {
      requestId: string;
      deviceCode: string;
    };

    await expect(
      t.mutation(api.cli.auth.denyAuthorizationRequest, { sessionId, requestId })
    ).resolves.toEqual({ success: true });

    const polled = await post('/cli/auth/token', { requestId, deviceCode });
    expect(polled.status).toBe(403);
    expect(polled.json).toEqual({ status: 'denied' });
  });

  test('a request past its TTL polls as 410 expired and cannot be approved', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const { requestId, deviceCode, userCode } = created.json as {
      requestId: string;
      deviceCode: string;
      userCode: string;
    };

    // Time is moved with fake timers, not by patching the row.
    vi.setSystemTime(NOW + REQUEST_TTL_MS);

    const polled = await post('/cli/auth/token', { requestId, deviceCode });
    expect(polled.status).toBe(410);
    expect(polled.json).toEqual({ status: 'expired' });

    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, { sessionId, requestId, userCode })
    ).resolves.toEqual({ success: false, reason: 'expired' });
  });
});

describe('not-found indistinguishability', () => {
  test('a wrong device code and an unknown request id are identical 404s', async () => {
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const { requestId, deviceCode } = created.json as {
      requestId: string;
      deviceCode: string;
    };

    const wrongDeviceCode = await post('/cli/auth/token', {
      requestId,
      deviceCode: 'f'.repeat(64),
    });
    const unknownRequest = await post('/cli/auth/token', {
      requestId: crypto.randomUUID(),
      deviceCode,
    });

    expect(wrongDeviceCode.status).toBe(404);
    expect(unknownRequest.status).toBe(404);
    expect(wrongDeviceCode.text).toBe(unknownRequest.text);
    expect(wrongDeviceCode.json).toEqual({ status: 'not_found' });

    // The real request is untouched.
    const row = await findRequestRow(requestId);
    expect(row?.status).toBe('pending');
    expect(row?.codeAttempts).toBe(0);
  });
});

describe('pending polls', () => {
  test('perform no write at all', async () => {
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const { requestId, deviceCode } = created.json as {
      requestId: string;
      deviceCode: string;
    };
    const before = await findRequestRow(requestId);

    for (let poll = 0; poll < 3; poll += 1) {
      const pending = await post('/cli/auth/token', { requestId, deviceCode });
      expect(pending.status).toBe(202);
    }

    const after = await findRequestRow(requestId);
    expect(after).toEqual(before);
    expect(after?._creationTime).toBe(before?._creationTime);
  });
});

describe('user code attempts', () => {
  test('five wrong codes deny the request and the poll sees denied', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const { requestId, deviceCode, userCode } = created.json as {
      requestId: string;
      deviceCode: string;
      userCode: string;
    };

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        t.mutation(api.cli.auth.approveAuthorizationRequest, {
          sessionId,
          requestId,
          userCode: '000000',
        })
      ).resolves.toEqual({ success: false, reason: 'code_mismatch' });
    }
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, {
        sessionId,
        requestId,
        userCode: '000000',
      })
    ).resolves.toEqual({ success: false, reason: 'too_many_attempts' });

    // The correct code no longer works once the request is denied.
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, { sessionId, requestId, userCode })
    ).resolves.toEqual({ success: false, reason: 'already_resolved' });

    const polled = await post('/cli/auth/token', { requestId, deviceCode });
    expect(polled.status).toBe(403);
    expect(polled.json).toEqual({ status: 'denied' });
  });
});

describe('rate limits', () => {
  test('the sixth pending request from one installation is 429 with retry-after', async () => {
    const installationId = newInstallationId();
    for (let index = 0; index < 5; index += 1) {
      const created = await post('/cli/auth/requests', {
        installationId,
        machineName: 'macbook-pro',
      });
      expect(created.status).toBe(201);
    }

    const blocked = await post('/cli/auth/requests', {
      installationId,
      machineName: 'macbook-pro',
    });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect(blocked.json).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests' },
    });

    // Another installation is unaffected.
    const other = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'other-machine',
    });
    expect(other.status).toBe(201);
  });

  test('200 unexpired pending requests block new logins globally', async () => {
    await seedPendingRequests(200);

    const blocked = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(blocked.status).toBe(429);
    expect(blocked.json).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests' },
    });
  });

  test('199 unexpired pending requests still allow a new login', async () => {
    await seedPendingRequests(199);

    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
  });

  test('reports login_disabled as 503', async () => {
    mockFlags.disableLogin = true;

    const blocked = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(blocked.status).toBe(503);
    expect(blocked.json).toEqual({
      error: { code: 'login_disabled', message: 'Login is currently disabled' },
    });
  });
});

describe('credential lifecycle', () => {
  test('re-login on the same device slot replaces the earlier token', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const installationId = newInstallationId();

    const first = await login({ sessionId, installationId });
    const second = await login({ sessionId, installationId });

    await expectLoginRequired(first.handle);
    await expect(domainsFor(second.handle)).resolves.toEqual([]);
  });

  test('the same installation in another environment keeps both tokens usable', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const installationId = newInstallationId();

    const production = await login({ sessionId, installationId, environment: 'prod' });
    const development = await login({ sessionId, installationId, environment: 'dev' });

    await expect(domainsFor(production.handle)).resolves.toEqual([]);
    await expect(domainsFor(development.handle)).resolves.toEqual([]);
  });

  test('the twenty-sixth credential evicts only the oldest', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);

    const logins: LoginResult[] = [];
    for (let index = 0; index < 26; index += 1) {
      // Distinct creation times so "oldest" is unambiguous.
      vi.setSystemTime(NOW + index * 1_000);
      logins.push(await login({ sessionId }));
    }

    await expectLoginRequired(logins[0].handle);
    for (const active of logins.slice(1)) {
      await expect(domainsFor(active.handle)).resolves.toEqual([]);
    }
  });

  test('a credential only sees its own user data', async () => {
    const alice = await seedFullUser('Alice', 'alice@example.com');
    const bob = await seedFullUser('Bob', 'bob@example.com');
    const aliceSession = await newBrowserSession(alice);
    const bobSession = await newBrowserSession(bob);

    const aliceLogin = await login({ sessionId: aliceSession });
    const bobLogin = await login({ sessionId: bobSession });

    await t.mutation(api.domain.createDomain, {
      sessionId: aliceLogin.handle as SessionId,
      name: 'Alice Only',
    });
    await t.mutation(api.domain.createDomain, {
      sessionId: bobLogin.handle as SessionId,
      name: 'Bob Only',
    });

    await expect(domainsFor(aliceLogin.handle)).resolves.toMatchObject([{ name: 'Alice Only' }]);
    const bobDomains = await domainsFor(bobLogin.handle);
    expect(bobDomains.map((domain) => domain.name)).toEqual(['Bob Only']);
  });
});

describe('request validation', () => {
  const machineName = 'macbook-pro';

  const invalidBodies: [string, Record<string, unknown>][] = [
    ['an unknown key', { extra: true }],
    ['a missing installation id', { installationId: undefined }],
    ['a non-UUID installation id', { installationId: 'not-a-uuid' }],
    ['an empty machine name', { machineName: '' }],
    ['a control-character-only machine name', { machineName: '\u0000\u001f' }],
    ['an environment with a space', { environment: 'a b' }],
  ];

  test.each(invalidBodies)('rejects %s with 400', async (_label, overrides) => {
    const body: Record<string, unknown> = {
      installationId: newInstallationId(),
      machineName,
      ...overrides,
    };
    if (overrides.installationId === undefined && 'installationId' in overrides) {
      delete body.installationId;
    }

    const result = await post('/cli/auth/requests', body);

    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects a non-hex device code on the token route', async () => {
    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName,
    });
    expect(created.status).toBe(201);

    const result = await post('/cli/auth/token', {
      requestId: created.json.requestId,
      deviceCode: 'Z'.repeat(64),
    });

    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects malformed JSON with 400', async () => {
    const result = await post('/cli/auth/requests', '{"installationId":');

    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects a non-JSON content type with 415', async () => {
    const result = await post('/cli/auth/requests', '{"installationId":"x","machineName":"y"}', {
      'content-type': 'text/plain',
    });

    expect(result.status).toBe(415);
    expect(result.json).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects an 8193-byte body by its declared content length', async () => {
    const body = bodyOfSize(8_193);

    const result = await post('/cli/auth/requests', body, {
      'content-length': String(new TextEncoder().encode(body).byteLength),
    });

    expect(result.status).toBe(413);
    expect(result.json).toEqual({
      error: { code: 'payload_too_large', message: 'Request body too large' },
    });
  });

  test('rejects an 8193-byte body by its measured byte length', async () => {
    const result = await post('/cli/auth/requests', bodyOfSize(8_193));

    expect(result.status).toBe(413);
    expect(result.json).toEqual({
      error: { code: 'payload_too_large', message: 'Request body too large' },
    });
  });

  test('a body exactly at the limit is parsed, not rejected for size', async () => {
    const result = await post('/cli/auth/requests', bodyOfSize(8_192));

    // The oversized machine name then fails validation, proving the size gate passed.
    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('strips control characters and normalises the environment in storage', async () => {
    const result = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: ' mac\u0000book\u001f pro ',
      environment: 'PROD ',
    });
    expect(result.status).toBe(201);

    const row = await findRequestRow(result.json.requestId as string);
    expect(row?.machineName).toBe('macbook pro');
    expect(row?.environment).toBe('prod');
  });

  test('error bodies never echo request content', async () => {
    const result = await post('/cli/auth/requests', {
      installationId: 'not-a-uuid-marker',
      machineName,
    });

    expect(result.status).toBe(400);
    expect(result.text).not.toContain('not-a-uuid-marker');
    expect(JSON.parse(result.text)).toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });
});

describe('revoke route', () => {
  test('rejects every unusable Authorization header identically', async () => {
    const cases: (string | undefined)[] = [
      undefined,
      'Basic dXNlcjpwYXNz',
      `Bearer gcl_${'a'.repeat(40)}`,
      `Bearer gcl_${'a'.repeat(43)}`,
    ];

    for (const authorization of cases) {
      const headers: Record<string, string> = authorization === undefined ? {} : { authorization };
      const result = await post('/cli/auth/revoke', undefined, headers);

      expect(result.status).toBe(401);
      expect(result.json).toEqual({ error: { code: 'unauthorized', message: 'Unauthorized' } });
    }
  });

  test('revokes a valid token without requiring a request body', async () => {
    const user = await seedFullUser();
    const sessionId = await newBrowserSession(user);
    const { token, handle } = await login({ sessionId });

    const result = await post('/cli/auth/revoke', undefined, {
      authorization: `Bearer ${token}`,
    });

    expect(result.status).toBe(200);
    expect(result.json).toEqual({ revoked: true });
    await expectLoginRequired(handle);
  });
});

describe('secret hygiene', () => {
  test('never logs or leaks a token, device code, handle or hash', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'debug'),
    ];

    const user = await seedFullUser('Alice', 'alice@example.com');
    const sessionId = await newBrowserSession(user);

    const created = await post('/cli/auth/requests', {
      installationId: newInstallationId(),
      machineName: 'macbook-pro',
    });
    expect(created.status).toBe(201);
    const requestId = created.json.requestId as string;
    const deviceCode = created.json.deviceCode as string;
    const userCode = created.json.userCode as string;

    await post('/cli/auth/token', { requestId, deviceCode });
    await t.mutation(api.cli.auth.approveAuthorizationRequest, { sessionId, requestId, userCode });
    const exchanged = await post('/cli/auth/token', { requestId, deviceCode });
    expect(exchanged.status).toBe(200);
    const token = exchanged.json.token as string;
    const handle = await deriveSessionHandle(token);

    await domainsFor(handle);
    const authorization = `Bearer ${token}`;

    // Failure paths too.
    await post('/cli/auth/token', { requestId, deviceCode: 'f'.repeat(64) });
    await post('/cli/auth/requests', { installationId: 'bad', machineName: 'x' });
    await post('/cli/auth/revoke', undefined, { authorization: 'Basic nope' });

    await post('/cli/auth/revoke', undefined, { authorization });
    await expectLoginRequired(handle);

    const rows = await t.run(async (ctx) => ({
      requests: await ctx.db.query('cliAuthRequests').collect(),
      credentials: await ctx.db.query('cliCredentials').collect(),
    }));
    const deviceCodeHash = rows.requests[0].deviceCodeHash;
    const handleHash = rows.credentials[0].handleHash;

    const consoleText = spies
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .map((argument: unknown) =>
        typeof argument === 'string' ? argument : JSON.stringify(argument)
      )
      .join('\n');
    for (const secret of [
      token,
      deviceCode,
      handle,
      handleHash,
      deviceCodeHash,
      userCode,
      authorization,
    ]) {
      expect(consoleText).not.toContain(secret);
    }

    const bodiesWithToken = responses.filter((body) => body.includes(token));
    expect(bodiesWithToken).toHaveLength(1);
    expect(JSON.parse(bodiesWithToken[0])).toMatchObject({ status: 'approved', token });

    const bodiesWithDeviceCode = responses.filter((body) => body.includes(deviceCode));
    expect(bodiesWithDeviceCode).toHaveLength(1);
    expect(JSON.parse(bodiesWithDeviceCode[0])).toMatchObject({ deviceCode });

    for (const body of responses) {
      expect(body).not.toContain(handle);
      expect(body).not.toContain(handleHash);
      expect(body).not.toContain(deviceCodeHash);
    }
  });
});

/** Builds a create-request body of exactly `size` UTF-8 bytes. */
function bodyOfSize(size: number): string {
  const prefix = '{"installationId":"00000000-0000-4000-8000-000000000000","machineName":"';
  const suffix = '"}';
  const body = prefix + 'a'.repeat(size - prefix.length - suffix.length) + suffix;
  expect(new TextEncoder().encode(body).byteLength).toBe(size);
  return body;
}
