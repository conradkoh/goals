/**
 * Integration tests for the CLI session resolver through the real
 * `requireLogin` seam.
 *
 * Every test drives public Convex functions (`api.domain.*`) instead of the
 * resolver directly, so the hash lookup, expiry/revocation rules and the
 * no-fall-through guarantee are exercised exactly as production code will use
 * them.
 */

import type { SessionId } from 'convex-helpers/server/sessions';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { t } from '../../test.setup';
import { deriveSessionHandle, generateToken, hashHandle } from '../cli/tokenCrypto';

async function seedUser(name = 'Test User'): Promise<Id<'users'>> {
  return t.run((ctx) =>
    ctx.db.insert('users', {
      type: 'anonymous',
      name,
    })
  );
}

interface CredentialOverrides {
  expiresAt?: number;
  revokedAt?: number;
  revokedReason?: 'user' | 'logout' | 'replaced' | 'limit';
}

async function seedCredential(
  token: string,
  userId: Id<'users'>,
  overrides: CredentialOverrides = {}
): Promise<void> {
  const handle = await deriveSessionHandle(token);
  const handleHash = await hashHandle(handle);
  await t.run((ctx) =>
    ctx.db.insert('cliCredentials', {
      userId,
      handleHash,
      installationId: 'install-1',
      machineName: 'test-machine',
      createdAt: Date.now(),
      expiresAt: overrides.expiresAt ?? Date.now() + 60_000,
      revokedAt: overrides.revokedAt,
      revokedReason: overrides.revokedReason,
    })
  );
}

async function seedBrowserSession(sessionId: string, userId: Id<'users'>): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('sessions', {
      sessionId,
      userId,
      createdAt: Date.now(),
      authMethod: 'anonymous',
    })
  );
}

function newToken(): string {
  return generateToken();
}

describe('cli_ handles through requireLogin', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('a valid credential authenticates queries and mutations as its user', async () => {
    const userId = await seedUser('Alice');
    const token = newToken();
    await seedCredential(token, userId);
    const sessionId = (await deriveSessionHandle(token)) as SessionId;

    const domains = await t.query(api.domain.getDomains, { sessionId });
    expect(domains).toEqual([]);

    const domainId = await t.mutation(api.domain.createDomain, {
      sessionId,
      name: 'CLI domain',
    });
    const created = await t.run((ctx) => ctx.db.get('domains', domainId));
    expect(created?.userId).toBe(userId);
    expect(created?.name).toBe('CLI domain');
  });

  test('an unknown cli_ handle is rejected', async () => {
    const sessionId = (await deriveSessionHandle(newToken())) as SessionId;

    await expect(t.query(api.domain.getDomains, { sessionId })).rejects.toThrow('Login required');
  });

  test('a revoked credential is rejected', async () => {
    const userId = await seedUser();
    const token = newToken();
    await seedCredential(token, userId, {
      revokedAt: Date.now(),
      revokedReason: 'user',
    });
    const sessionId = (await deriveSessionHandle(token)) as SessionId;

    await expect(t.query(api.domain.getDomains, { sessionId })).rejects.toThrow('Login required');
  });

  test('an expired credential is rejected, including exactly at expiresAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = 1_800_000_000_000;
    vi.setSystemTime(now);

    const userId = await seedUser();
    const token = newToken();
    await seedCredential(token, userId, { expiresAt: now + 1_000 });
    const sessionId = (await deriveSessionHandle(token)) as SessionId;

    await expect(t.query(api.domain.getDomains, { sessionId })).resolves.toEqual([]);

    vi.setSystemTime(now + 999);
    await expect(t.query(api.domain.getDomains, { sessionId })).resolves.toEqual([]);

    vi.setSystemTime(now + 1_000);
    await expect(t.query(api.domain.getDomains, { sessionId })).rejects.toThrow('Login required');

    vi.setSystemTime(now + 5_000);
    await expect(t.query(api.domain.getDomains, { sessionId })).rejects.toThrow('Login required');
  });

  test('never falls through to a sessions row with the same cli_ id', async () => {
    const userId = await seedUser('Alice');
    const sessionId = (await deriveSessionHandle(newToken())) as SessionId;
    await seedBrowserSession(sessionId, userId);

    await expect(t.query(api.domain.getDomains, { sessionId })).rejects.toThrow('Login required');
  });

  test('isolates domains between credential owners', async () => {
    const userA = await seedUser('Alice');
    const userB = await seedUser('Bob');
    const tokenA = newToken();
    await seedCredential(tokenA, userA);
    const sessionIdA = (await deriveSessionHandle(tokenA)) as SessionId;

    await t.mutation(api.domain.createDomain, { sessionId: sessionIdA, name: 'A only' });
    await t.run((ctx) => ctx.db.insert('domains', { userId: userB, name: 'B only' }));

    const domains = await t.query(api.domain.getDomains, { sessionId: sessionIdA });
    expect(domains.map((domain) => domain.name)).toEqual(['A only']);
  });

  test('browser sessions still authenticate', async () => {
    const userId = await seedUser('Browser User');
    const sessionId = 'browser-session-1' as SessionId;
    await seedBrowserSession(sessionId, userId);

    const domains = await t.query(api.domain.getDomains, { sessionId });
    expect(domains).toEqual([]);
  });

  test('cli_ handles are rejected by default-resolver surfaces', async () => {
    const userId = await seedUser('Alice');
    const token = newToken();
    await seedCredential(token, userId);
    const sessionId = (await deriveSessionHandle(token)) as SessionId;

    const state = await t.query(api.auth.getState, { sessionId });
    expect(state.state).toBe('unauthenticated');

    const sessions = await t.query(api.sessions.listMySessions, { sessionId });
    expect(sessions).toEqual({ success: false, reason: 'not_authenticated' });

    await expect(t.query(api.admin.users.listUsers, { sessionId })).rejects.toThrow(
      'You must be logged in to list users'
    );
  });
});
