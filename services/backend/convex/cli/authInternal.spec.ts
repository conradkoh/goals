/**
 * State-machine tests for the internal CLI device-code mutations.
 *
 * These drive the real database through convex-test and assert the security
 * invariants directly: hash-at-rest, indistinguishable `not_found`, a
 * write-free pending poll, an atomic consume, caps, replacement and retention.
 * Expected values are literal clock arithmetic, never the production formula.
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
const ONE_HOUR = 3_600_000;
const ONE_DAY = 86_400_000;

/** Fixed 64-hex device-code digest; also a literal 64-hex handle digest. */
const DEVICE_CODE_HASH = '0123456789abcdef'.repeat(4);
const OTHER_DEVICE_CODE_HASH = 'fedcba9876543210'.repeat(4);
const CANDIDATE_HANDLE_HASH = 'abcdef0123456789'.repeat(4);
const RAW_DEVICE_CODE = 'raw-device-code-must-never-be-stored';
const USER_CODE = '123456';
const INSTALLATION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_INSTALLATION_ID = '22222222-2222-4222-8222-222222222222';

const mockFlags = vi.hoisted(() => ({ disableLogin: false }));

vi.mock('../../config/featureFlags', () => ({
  featureFlags: {
    get disableLogin() {
      return mockFlags.disableLogin;
    },
    allowedSignupMethods: ['self'],
  },
}));

type RequestStatus = 'pending' | 'approved' | 'denied' | 'consumed';
type RevokedReason = 'user' | 'logout' | 'replaced' | 'limit';

interface RequestOverrides {
  requestId?: string;
  deviceCodeHash?: string;
  userCode?: string;
  installationId?: string;
  machineName?: string;
  environment?: string;
  status?: RequestStatus;
  createdAt?: number;
  expiresAt?: number;
  approvedByUserId?: Id<'users'>;
  resolvedAt?: number;
  codeAttempts?: number;
}

async function seedRequest(
  overrides: RequestOverrides = {}
): Promise<{ id: Id<'cliAuthRequests'>; requestId: string }> {
  const requestId = overrides.requestId ?? crypto.randomUUID();
  const id = await t.run((ctx) =>
    ctx.db.insert('cliAuthRequests', {
      requestId,
      deviceCodeHash: overrides.deviceCodeHash ?? DEVICE_CODE_HASH,
      userCode: overrides.userCode ?? USER_CODE,
      installationId: overrides.installationId ?? INSTALLATION_ID,
      machineName: overrides.machineName ?? 'machine-1',
      environment: overrides.environment,
      status: overrides.status ?? 'pending',
      createdAt: overrides.createdAt ?? NOW,
      expiresAt: overrides.expiresAt ?? NOW + 10 * ONE_MINUTE,
      approvedByUserId: overrides.approvedByUserId,
      resolvedAt: overrides.resolvedAt,
      codeAttempts: overrides.codeAttempts ?? 0,
    })
  );
  return { id, requestId };
}

async function seedUser(name = 'Test User', email?: string): Promise<Id<'users'>> {
  return t.run((ctx) =>
    ctx.db.insert(
      'users',
      email === undefined
        ? { type: 'anonymous' as const, name }
        : { type: 'full' as const, name, email }
    )
  );
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
  revokedReason?: RevokedReason;
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
      machineName: overrides.machineName ?? 'machine-1',
      environment: overrides.environment,
      createdAt: overrides.createdAt ?? NOW,
      expiresAt: overrides.expiresAt ?? NOW + 180 * ONE_DAY,
      lastUsedAt: overrides.lastUsedAt,
      revokedAt: overrides.revokedAt,
      revokedReason: overrides.revokedReason,
    })
  );
}

function createArgs(
  overrides: Partial<{
    requestId: string;
    deviceCodeHash: string;
    userCode: string;
    installationId: string;
    machineName: string;
    environment: string;
  }> = {}
) {
  return {
    requestId: overrides.requestId ?? crypto.randomUUID(),
    deviceCodeHash: overrides.deviceCodeHash ?? DEVICE_CODE_HASH,
    userCode: overrides.userCode ?? USER_CODE,
    installationId: overrides.installationId ?? INSTALLATION_ID,
    machineName: overrides.machineName ?? 'machine-1',
    environment: overrides.environment,
  };
}

async function countRequests(): Promise<number> {
  return t.run(async (ctx) => (await ctx.db.query('cliAuthRequests').collect()).length);
}

async function countCredentials(): Promise<number> {
  return t.run(async (ctx) => (await ctx.db.query('cliCredentials').collect()).length);
}

// A fresh convex-test instance per test keeps row counts (caps, retention)
// independent of earlier tests in this file.
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

describe('createRequest', () => {
  test('stores only the device-code hash and returns the literal expiry', async () => {
    const args = createArgs({ environment: 'production' });

    const result = await t.mutation(internal.cli.authInternal.createRequest, args);

    expect(result).toEqual({ ok: true, expiresAt: NOW + 600_000 });

    const row = await t.run((ctx) =>
      ctx.db
        .query('cliAuthRequests')
        .withIndex('by_requestId', (q) => q.eq('requestId', args.requestId))
        .first()
    );
    expect(row).not.toBeNull();
    const definedKeys = Object.entries(row ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key)
      .sort();
    expect(definedKeys).toEqual([
      '_creationTime',
      '_id',
      'codeAttempts',
      'createdAt',
      'deviceCodeHash',
      'environment',
      'expiresAt',
      'installationId',
      'machineName',
      'requestId',
      'status',
      'userCode',
    ]);
    expect(row?.deviceCodeHash).toBe(DEVICE_CODE_HASH);
    expect(row?.status).toBe('pending');
    expect(row?.codeAttempts).toBe(0);
    expect(row?.expiresAt).toBe(NOW + 600_000);
    expect(row?.createdAt).toBe(NOW);
    expect(JSON.stringify(row)).not.toContain(RAW_DEVICE_CODE);
  });

  test('refuses a new request when 200 pending requests already exist', async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 200; index += 1) {
        await ctx.db.insert('cliAuthRequests', {
          requestId: `pending-${index}`,
          deviceCodeHash: DEVICE_CODE_HASH,
          userCode: USER_CODE,
          installationId: `install-${index}`,
          machineName: 'machine-1',
          status: 'pending',
          createdAt: NOW,
          expiresAt: NOW + ONE_MINUTE,
          codeAttempts: 0,
        });
      }
    });

    const result = await t.mutation(internal.cli.authInternal.createRequest, createArgs());

    expect(result).toEqual({ ok: false, reason: 'rate_limited' });
    expect(await countRequests()).toBe(200);
  });

  test('allows a new request when 199 pending requests exist', async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 199; index += 1) {
        await ctx.db.insert('cliAuthRequests', {
          requestId: `pending-${index}`,
          deviceCodeHash: DEVICE_CODE_HASH,
          userCode: USER_CODE,
          installationId: `install-${index}`,
          machineName: 'machine-1',
          status: 'pending',
          createdAt: NOW,
          expiresAt: NOW + ONE_MINUTE,
          codeAttempts: 0,
        });
      }
    });

    const result = await t.mutation(internal.cli.authInternal.createRequest, createArgs());

    expect(result).toEqual({ ok: true, expiresAt: NOW + 600_000 });
    expect(await countRequests()).toBe(200);
  });

  test('does not count already-expired pending rows toward the global cap', async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 200; index += 1) {
        await ctx.db.insert('cliAuthRequests', {
          requestId: `expired-${index}`,
          deviceCodeHash: DEVICE_CODE_HASH,
          userCode: USER_CODE,
          installationId: `install-${index}`,
          machineName: 'machine-1',
          status: 'pending',
          createdAt: NOW - 2 * ONE_MINUTE,
          expiresAt: NOW - ONE_MINUTE,
          codeAttempts: 0,
        });
      }
    });

    const result = await t.mutation(internal.cli.authInternal.createRequest, createArgs());

    expect(result).toEqual({ ok: true, expiresAt: NOW + 600_000 });
  });

  test('caps pending requests per installation at five', async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 5; index += 1) {
        await ctx.db.insert('cliAuthRequests', {
          requestId: `same-install-${index}`,
          deviceCodeHash: DEVICE_CODE_HASH,
          userCode: USER_CODE,
          installationId: INSTALLATION_ID,
          machineName: 'machine-1',
          status: 'pending',
          createdAt: NOW,
          expiresAt: NOW + ONE_MINUTE,
          codeAttempts: 0,
        });
      }
    });

    const blocked = await t.mutation(
      internal.cli.authInternal.createRequest,
      createArgs({ installationId: INSTALLATION_ID })
    );
    expect(blocked).toEqual({ ok: false, reason: 'rate_limited' });

    const otherInstallation = await t.mutation(
      internal.cli.authInternal.createRequest,
      createArgs({ installationId: OTHER_INSTALLATION_ID })
    );
    expect(otherInstallation).toEqual({ ok: true, expiresAt: NOW + 600_000 });
  });

  test('allows a fifth pending request for the same installation', async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 4; index += 1) {
        await ctx.db.insert('cliAuthRequests', {
          requestId: `same-install-${index}`,
          deviceCodeHash: DEVICE_CODE_HASH,
          userCode: USER_CODE,
          installationId: INSTALLATION_ID,
          machineName: 'machine-1',
          status: 'pending',
          createdAt: NOW,
          expiresAt: NOW + ONE_MINUTE,
          codeAttempts: 0,
        });
      }
    });

    const result = await t.mutation(
      internal.cli.authInternal.createRequest,
      createArgs({ installationId: INSTALLATION_ID })
    );

    expect(result).toEqual({ ok: true, expiresAt: NOW + 600_000 });
  });

  test('returns login_disabled without writing', async () => {
    mockFlags.disableLogin = true;

    const result = await t.mutation(internal.cli.authInternal.createRequest, createArgs());

    expect(result).toEqual({ ok: false, reason: 'login_disabled' });
    expect(await countRequests()).toBe(0);
  });

  test('lazily deletes request rows expired for more than one hour', async () => {
    const stalePending = await seedRequest({
      status: 'pending',
      expiresAt: NOW - ONE_HOUR - ONE_MINUTE,
    });
    const staleConsumed = await seedRequest({
      status: 'consumed',
      expiresAt: NOW - ONE_HOUR - ONE_MINUTE,
    });
    const fresh = await seedRequest({ status: 'pending', expiresAt: NOW - ONE_MINUTE });

    await t.mutation(internal.cli.authInternal.createRequest, createArgs());

    const remaining = await t.run((ctx) => ctx.db.query('cliAuthRequests').collect());
    const ids = remaining.map((row) => row._id);
    expect(ids).not.toContain(stalePending.id);
    expect(ids).not.toContain(staleConsumed.id);
    expect(ids).toContain(fresh.id);
  });
});

describe('pollOrConsume', () => {
  test('unknown request id and wrong device code hash are indistinguishable', async () => {
    const { requestId } = await seedRequest();

    const unknown = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId: 'no-such-request',
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });
    const wrongCode = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: OTHER_DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(unknown).toEqual({ status: 'not_found' });
    expect(wrongCode).toEqual(unknown);
  });

  test('a pending poll performs no write at all', async () => {
    const { id, requestId } = await seedRequest();
    const before = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result).toEqual({ status: 'pending' });
    const after = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(after).toEqual(before);
  });

  test('a pending request past its expiry reports expired and is not written', async () => {
    const { id, requestId } = await seedRequest({ expiresAt: NOW });
    const before = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result).toEqual({ status: 'expired' });
    expect(await t.run((ctx) => ctx.db.get('cliAuthRequests', id))).toEqual(before);
  });

  test('a denied request reports denied', async () => {
    const { requestId } = await seedRequest({ status: 'denied' });

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result).toEqual({ status: 'denied' });
  });

  test('an approved request issues exactly one credential and consumes the request', async () => {
    const user = await seedUser('Alice', 'alice@example.com');
    const { id, requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
      environment: 'production',
    });

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result.status).toBe('approved');
    if (result.status !== 'approved') throw new Error('expected approval');
    expect(result.expiresAt).toBe(NOW + 15_552_000_000);
    expect(result.user).toEqual({
      userId: user,
      name: 'Alice',
      email: 'alice@example.com',
    });

    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.status).toBe('consumed');
    expect(row?.resolvedAt).toBe(NOW);

    const credentials = await t.run((ctx) => ctx.db.query('cliCredentials').collect());
    expect(credentials).toHaveLength(1);
    expect(credentials[0].userId).toBe(user);
    expect(credentials[0].handleHash).toBe(CANDIDATE_HANDLE_HASH);
    expect(credentials[0].installationId).toBe(INSTALLATION_ID);
    expect(credentials[0].machineName).toBe('machine-1');
    expect(credentials[0].environment).toBe('production');
    expect(credentials[0].createdAt).toBe(NOW);
    expect(credentials[0].expiresAt).toBe(NOW + 15_552_000_000);
    expect(credentials[0].revokedAt).toBeUndefined();

    const second = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });
    expect(second).toEqual({ status: 'consumed' });
    expect(await countCredentials()).toBe(1);
  });

  test('reports the anonymous user without an email', async () => {
    const user = await seedUser('Anon');
    const { requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
    });

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result.status).toBe('approved');
    if (result.status !== 'approved') throw new Error('expected approval');
    expect(result.user).toEqual({ userId: user, name: 'Anon', email: undefined });
  });

  test('an approved request past its expiry reports expired and issues no credential', async () => {
    const user = await seedUser();
    const { id, requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
      expiresAt: NOW,
    });

    const result = await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    expect(result).toEqual({ status: 'expired' });
    expect(await countCredentials()).toBe(0);
    const row = await t.run((ctx) => ctx.db.get('cliAuthRequests', id));
    expect(row?.status).toBe('approved');
  });

  test('replaces the previous credential for the same installation and environment', async () => {
    const user = await seedUser();
    const sameInstallation = await seedCredential(user, {
      installationId: INSTALLATION_ID,
      environment: 'production',
    });
    const otherEnvironment = await seedCredential(user, {
      installationId: INSTALLATION_ID,
      environment: 'staging',
    });
    const otherInstallation = await seedCredential(user, {
      installationId: OTHER_INSTALLATION_ID,
      environment: 'production',
    });
    const { requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
      environment: 'production',
    });

    await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    const replaced = await t.run((ctx) => ctx.db.get('cliCredentials', sameInstallation));
    expect(replaced?.revokedAt).toBe(NOW);
    expect(replaced?.revokedReason).toBe('replaced');
    expect(
      (await t.run((ctx) => ctx.db.get('cliCredentials', otherEnvironment)))?.revokedAt
    ).toBeUndefined();
    expect(
      (await t.run((ctx) => ctx.db.get('cliCredentials', otherInstallation)))?.revokedAt
    ).toBeUndefined();
  });

  test('treats an undefined environment as equal to an undefined environment', async () => {
    const user = await seedUser();
    const sameInstallation = await seedCredential(user, { installationId: INSTALLATION_ID });
    const { requestId } = await seedRequest({ status: 'approved', approvedByUserId: user });

    await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    const replaced = await t.run((ctx) => ctx.db.get('cliCredentials', sameInstallation));
    expect(replaced?.revokedReason).toBe('replaced');
  });

  test('enforces the 25-credential cap by revoking the oldest credential', async () => {
    const user = await seedUser();
    const ids: Id<'cliCredentials'>[] = [];
    await t.run(async (ctx) => {
      for (let index = 0; index < 25; index += 1) {
        ids.push(
          await ctx.db.insert('cliCredentials', {
            userId: user,
            handleHash: `hash-${index}`,
            installationId: `install-${index}`,
            machineName: `machine-${index}`,
            createdAt: NOW - 10 * ONE_DAY + index * ONE_MINUTE,
            expiresAt: NOW + 180 * ONE_DAY,
          })
        );
      }
    });
    const oldest = ids[0];
    const { requestId } = await seedRequest({ status: 'approved', approvedByUserId: user });

    await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    const revoked = await t.run((ctx) => ctx.db.get('cliCredentials', oldest));
    expect(revoked?.revokedAt).toBe(NOW);
    expect(revoked?.revokedReason).toBe('limit');

    const credentials = await t.run((ctx) => ctx.db.query('cliCredentials').collect());
    expect(credentials.filter((row) => row.revokedAt === undefined)).toHaveLength(25);
  });

  test('does not revoke anything when the user has 24 active credentials', async () => {
    const user = await seedUser();
    await t.run(async (ctx) => {
      for (let index = 0; index < 24; index += 1) {
        await ctx.db.insert('cliCredentials', {
          userId: user,
          handleHash: `hash-${index}`,
          installationId: `install-${index}`,
          machineName: `machine-${index}`,
          createdAt: NOW - 10 * ONE_DAY + index * ONE_MINUTE,
          expiresAt: NOW + 180 * ONE_DAY,
        });
      }
    });
    const { requestId } = await seedRequest({ status: 'approved', approvedByUserId: user });

    await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    const credentials = await t.run((ctx) => ctx.db.query('cliCredentials').collect());
    expect(credentials).toHaveLength(25);
    expect(credentials.every((row) => row.revokedAt === undefined)).toBe(true);
  });

  test('leaves another user credential with the same installation untouched', async () => {
    const user = await seedUser('Alice');
    const otherUser = await seedUser('Bob');
    const otherCredential = await seedCredential(otherUser, {
      installationId: INSTALLATION_ID,
      environment: 'production',
    });
    const { requestId } = await seedRequest({
      status: 'approved',
      approvedByUserId: user,
      environment: 'production',
    });

    await t.mutation(internal.cli.authInternal.pollOrConsume, {
      requestId,
      deviceCodeHash: DEVICE_CODE_HASH,
      candidateHandleHash: CANDIDATE_HANDLE_HASH,
    });

    const row = await t.run((ctx) => ctx.db.get('cliCredentials', otherCredential));
    expect(row?.revokedAt).toBeUndefined();
  });
});

describe('resolveHandle', () => {
  test('returns the credential behind a valid handle', async () => {
    const user = await seedUser('Alice');
    const handle = await deriveSessionHandle(generateToken());
    const credentialId = await seedCredential(user, {
      handleHash: await hashHandle(handle),
      environment: 'production',
      lastUsedAt: NOW - ONE_MINUTE,
    });

    const result = await t.query(internal.cli.authInternal.resolveHandle, { handle });

    expect(result).toEqual({
      credentialId,
      userId: user,
      expiresAt: NOW + 180 * ONE_DAY,
      lastUsedAt: NOW - ONE_MINUTE,
      machineName: 'machine-1',
      environment: 'production',
      createdAt: NOW,
    });
  });

  test('returns null for unknown, revoked, expired and non-CLI handles', async () => {
    const user = await seedUser();
    const revokedHandle = await deriveSessionHandle(generateToken());
    const expiredHandle = await deriveSessionHandle(generateToken());
    await seedCredential(user, {
      handleHash: await hashHandle(revokedHandle),
      revokedAt: NOW,
      revokedReason: 'user',
    });
    await seedCredential(user, {
      handleHash: await hashHandle(expiredHandle),
      expiresAt: NOW,
    });

    await expect(
      t.query(internal.cli.authInternal.resolveHandle, {
        handle: await deriveSessionHandle(generateToken()),
      })
    ).resolves.toBeNull();
    await expect(
      t.query(internal.cli.authInternal.resolveHandle, { handle: revokedHandle })
    ).resolves.toBeNull();
    await expect(
      t.query(internal.cli.authInternal.resolveHandle, { handle: expiredHandle })
    ).resolves.toBeNull();
    await expect(
      t.query(internal.cli.authInternal.resolveHandle, { handle: 'session-1' })
    ).resolves.toBeNull();
  });
});

describe('touchCredential', () => {
  test('writes lastUsedAt on first touch, then at most once per ten minutes', async () => {
    const user = await seedUser();
    const credentialId = await seedCredential(user);

    await t.mutation(internal.cli.authInternal.touchCredential, { credentialId });
    expect((await t.run((ctx) => ctx.db.get('cliCredentials', credentialId)))?.lastUsedAt).toBe(
      NOW
    );

    vi.setSystemTime(NOW + 9 * ONE_MINUTE);
    await t.mutation(internal.cli.authInternal.touchCredential, { credentialId });
    expect((await t.run((ctx) => ctx.db.get('cliCredentials', credentialId)))?.lastUsedAt).toBe(
      NOW
    );

    vi.setSystemTime(NOW + 10 * ONE_MINUTE);
    await t.mutation(internal.cli.authInternal.touchCredential, { credentialId });
    expect((await t.run((ctx) => ctx.db.get('cliCredentials', credentialId)))?.lastUsedAt).toBe(
      NOW + 10 * ONE_MINUTE
    );
  });

  test('does not touch a revoked credential', async () => {
    const user = await seedUser();
    const credentialId = await seedCredential(user, {
      revokedAt: NOW - ONE_MINUTE,
      revokedReason: 'user',
    });

    await t.mutation(internal.cli.authInternal.touchCredential, { credentialId });

    expect(
      (await t.run((ctx) => ctx.db.get('cliCredentials', credentialId)))?.lastUsedAt
    ).toBeUndefined();
  });

  test('ignores a missing credential', async () => {
    const user = await seedUser();
    const credentialId = await seedCredential(user);
    await t.run((ctx) => ctx.db.delete('cliCredentials', credentialId));

    await expect(
      t.mutation(internal.cli.authInternal.touchCredential, { credentialId })
    ).resolves.toBeNull();
  });
});

describe('revokeByHandle', () => {
  test('revokes once, is idempotent, and makes requireLogin reject the handle', async () => {
    const user = await seedUser();
    const handle = await deriveSessionHandle(generateToken());
    const handleHash = await hashHandle(handle);
    await seedCredential(user, { handleHash });

    await expect(t.mutation(internal.cli.authInternal.revokeByHandle, { handle })).resolves.toEqual(
      { revoked: true }
    );
    const row = await t.run((ctx) =>
      ctx.db
        .query('cliCredentials')
        .withIndex('by_handleHash', (q) => q.eq('handleHash', handleHash))
        .first()
    );
    expect(row?.revokedAt).toBe(NOW);
    expect(row?.revokedReason).toBe('logout');

    await expect(t.mutation(internal.cli.authInternal.revokeByHandle, { handle })).resolves.toEqual(
      { revoked: false }
    );

    await expect(
      t.query(api.domain.getDomains, { sessionId: handle as SessionId })
    ).rejects.toThrow('Login required');
  });

  test('reports false for an unknown handle', async () => {
    const handle = await deriveSessionHandle(generateToken());

    await expect(t.mutation(internal.cli.authInternal.revokeByHandle, { handle })).resolves.toEqual(
      { revoked: false }
    );
  });
});

describe('cleanupExpiredCliData', () => {
  test('deletes stale requests and stale credentials but keeps recent and active rows', async () => {
    const user = await seedUser();
    const oldRequest = await seedRequest({
      status: 'pending',
      expiresAt: NOW - 2 * ONE_HOUR,
    });
    const recentRequest = await seedRequest({
      status: 'denied',
      expiresAt: NOW - ONE_MINUTE,
    });
    const revokedLongAgo = await seedCredential(user, {
      handleHash: 'revoked-long-ago',
      revokedAt: NOW - 31 * ONE_DAY,
      revokedReason: 'user',
    });
    const expiredLongAgo = await seedCredential(user, {
      handleHash: 'expired-long-ago',
      expiresAt: NOW - 31 * ONE_DAY,
    });
    const revokedRecently = await seedCredential(user, {
      handleHash: 'revoked-recently',
      revokedAt: NOW - ONE_DAY,
      revokedReason: 'logout',
    });
    const active = await seedCredential(user, { handleHash: 'active-credential' });

    const result = await t.mutation(internal.cli.authInternal.cleanupExpiredCliData, {});

    expect(result).toEqual({ success: true, deletedCount: 3 });
    const remainingRequests = await t.run((ctx) => ctx.db.query('cliAuthRequests').collect());
    const requestIds = remainingRequests.map((row) => row._id);
    expect(requestIds).not.toContain(oldRequest.id);
    expect(requestIds).toContain(recentRequest.id);

    const remainingCredentials = await t.run((ctx) => ctx.db.query('cliCredentials').collect());
    const credentialIds = remainingCredentials.map((row) => row._id);
    expect(credentialIds).not.toContain(revokedLongAgo);
    expect(credentialIds).not.toContain(expiredLongAgo);
    expect(credentialIds).toContain(revokedRecently);
    expect(credentialIds).toContain(active);
  });
});
