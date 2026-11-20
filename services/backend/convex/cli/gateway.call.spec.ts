/**
 * Gateway auth, framing and allowlist specs.
 *
 * The seam is `t.fetch('/cli/v1/call', …)` over the real router, device-code
 * login and Convex functions. Assertions use literal statuses, bodies and
 * limits; production constants are never used to compute an expectation.
 */

import { CLI_OP_NAMES } from '@workspace/shared/utilities/cli-contract';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CLI_OPS } from '../../modules/cli/gateway/registry';
import {
  makeGateway,
  ONE_MINUTE,
  CREDENTIAL_TTL_MS,
  type Gateway,
} from '../../modules/cli/gateway/testKit';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

const OP_NAMES = [
  'auth.whoami',
  'export.quarterSummary',
  'goal.create',
  'goal.delete',
  'goal.get',
  'goal.list',
  'goal.rename',
  'goal.setComplete',
  'initiative.get',
  'initiative.list',
];

let g: Gateway;

beforeEach(() => {
  g = makeGateway();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_800_000_000_000);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A well-formed but never-issued token. */
const UNKNOWN_TOKEN = `gcl_${'a'.repeat(43)}`;

describe('credential authentication', () => {
  test.each([
    ['missing', undefined],
    ['garbled', 'Bearer not-a-token'],
    ['basic', 'Basic dXNlcjpwYXNz'],
    ['wrong length', `Bearer gcl_${'a'.repeat(40)}`],
  ])('%s authorization is 401', async (_label, authorization) => {
    const headers: Record<string, string> = authorization === undefined ? {} : { authorization };
    const result = await g.post('/cli/v1/call', { op: 'auth.whoami' }, headers);

    expect(result.status).toBe(401);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'unauthorized', message: 'Unauthorized' },
    });
  });

  test('an unknown token is 401', async () => {
    const result = await g.call(UNKNOWN_TOKEN, 'auth.whoami');

    expect(result.status).toBe(401);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'unauthorized', message: 'Invalid or revoked credential' },
    });
  });

  test('a revoked credential is 401 on the very next call', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    await expect(g.call(token, 'auth.whoami')).resolves.toMatchObject({ status: 200 });
    await g.post('/cli/auth/revoke', undefined, { authorization: `Bearer ${token}` });

    const result = await g.call(token, 'auth.whoami');
    expect(result.status).toBe(401);
  });

  test('an expired credential is 401', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    vi.setSystemTime(1_800_000_000_000 + CREDENTIAL_TTL_MS + 1);
    const result = await g.call(token, 'auth.whoami');
    expect(result.status).toBe(401);
  });
});

describe('body framing', () => {
  test('rejects a non-JSON content type with 415', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.post('/cli/v1/call', JSON.stringify({ op: 'auth.whoami' }), {
      'content-type': 'text/plain',
      authorization: `Bearer ${token}`,
    });

    expect(result.status).toBe(415);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects a body one byte over 64 KiB with 413', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const body = JSON.stringify({ op: 'auth.whoami', args: { padding: 'a'.repeat(65_536) } });
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(65_536);

    const result = await g.post('/cli/v1/call', body, { authorization: `Bearer ${token}` });
    expect(result.status).toBe(413);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'payload_too_large', message: 'Request body too large' },
    });
  });

  test('rejects an over-limit body declared by content-length', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.post('/cli/v1/call', '{"op":"auth.whoami"}', {
      authorization: `Bearer ${token}`,
      'content-length': '70000',
    });
    expect(result.status).toBe(413);
  });

  test('rejects invalid JSON with 400', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.post('/cli/v1/call', '{"op":', { authorization: `Bearer ${token}` });
    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects a missing or non-string op with 400', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    for (const body of [{}, { op: 42 }, { op: '' }, { op: 'x'.repeat(65) }]) {
      const result = await g.post('/cli/v1/call', body, { authorization: `Bearer ${token}` });
      expect(result.status).toBe(400);
      expect(result.json.error.code).toBe('invalid_argument');
    }
  });
});

describe('op allowlist', () => {
  test('unknown, prototype and admin-ish ops are 400', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    for (const op of [
      'constructor',
      '__proto__',
      'admin.listUsers',
      'goal.move',
      'goal.deleteMany',
    ]) {
      const result = await g.call(token, op, {});
      expect(result.status).toBe(400);
      expect(result.json).toEqual({
        ok: false,
        error: { code: 'invalid_argument', message: 'Unknown op' },
      });
    }
  });

  test('the registry matches the contract exactly', () => {
    expect(Object.keys(CLI_OPS).sort()).toEqual([...CLI_OP_NAMES].sort());
    expect(Object.keys(CLI_OPS).sort()).toEqual(OP_NAMES);
  });
});

describe('argument validation', () => {
  test('an extra key is rejected without echoing it', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'auth.whoami', { sentinel: 'do-not-echo' });
    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'invalid_argument', message: 'Unknown argument' },
    });
    expect(result.text).not.toContain('do-not-echo');
    expect(result.text).not.toContain('sentinel');
  });

  test('a wrong-typed argument names only the schema key', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
      limit: 'do-not-echo',
    });
    expect(result.status).toBe(400);
    expect(result.json).toEqual({
      ok: false,
      error: { code: 'invalid_argument', message: 'Invalid argument: limit' },
    });
    expect(result.text).not.toContain('do-not-echo');
  });

  test('a limit above 500 is 400', async () => {
    const user = await g.seedUser();
    const { token } = await g.login(user);

    const result = await g.call(token, 'goal.list', {
      scope: 'quarterly',
      year: 2026,
      quarter: 3,
      limit: 501,
    });
    expect(result.status).toBe(400);
  });
});

describe('credential touch throttle', () => {
  test('writes lastUsedAt once per ten minutes', async () => {
    const user = await g.seedUser();
    const { token, credentialId } = await g.login(user);
    const readLastUsedAt = async () =>
      g.t.run(async (ctx) => {
        const row = await ctx.db.get('cliCredentials', credentialId as Id<'cliCredentials'>);
        return row?.lastUsedAt;
      });

    await g.call(token, 'auth.whoami');
    expect(await readLastUsedAt()).toBe(1_800_000_000_000);

    vi.setSystemTime(1_800_000_000_000 + 9 * ONE_MINUTE);
    await g.call(token, 'auth.whoami');
    expect(await readLastUsedAt()).toBe(1_800_000_000_000);

    vi.setSystemTime(1_800_000_000_000 + 11 * ONE_MINUTE);
    await g.call(token, 'auth.whoami');
    expect(await readLastUsedAt()).toBe(1_800_000_000_000 + 11 * ONE_MINUTE);
  });
});

describe('cli handles stay off browser surfaces', () => {
  test('default-resolver surfaces reject a cli handle', async () => {
    const user = await g.seedUser();
    const { handle } = await g.login(user);

    await expect(
      g.t.query(api.cli.auth.listMyCliCredentials, { sessionId: handle })
    ).rejects.toThrow();

    const state = await g.t.query(api.auth.getState, { sessionId: handle });
    expect(state.state).toBe('unauthenticated');

    const sessions = await g.t.query(api.sessions.listMySessions, { sessionId: handle });
    expect(sessions).toEqual({ success: false, reason: 'not_authenticated' });

    await expect(g.t.query(api.admin.users.listUsers, { sessionId: handle })).rejects.toThrow(
      'You must be logged in to list users'
    );
  });
});
