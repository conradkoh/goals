// fallow-ignore-file unused-file
/**
 * Shared harness for the `/cli/v1/call` gateway specs.
 *
 * Lives outside `convex/` (deployable functions) but is only imported by
 * `*.spec.ts` files. The seam is `t.fetch`, so every spec drives the real
 * `httpRouter`, the real device-code login and the real Convex functions.
 *
 * The only substituted collaborator is time (`vi.useFakeTimers` with `Date`),
 * which lets token expiry and the touch throttle be asserted with literals.
 */

import type { SessionId } from 'convex-helpers/server/sessions';
import type { TestConvex } from 'convex-test';
import { convexTest } from 'convex-test';
import { expect } from 'vitest';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import schema from '../../../convex/schema';
import { modules } from '../../../test.setup';
import { deriveSessionHandle } from '../tokenCrypto';

/** Fixed clock every gateway spec runs at. */
export const NOW = 1_800_000_000_000;
/** One minute in milliseconds. */
export const ONE_MINUTE = 60_000;
/** One hour in milliseconds. */
export const ONE_HOUR = 60 * ONE_MINUTE;
/** Credential lifetime from the contract (180 days). */
export const CREDENTIAL_TTL_MS = 180 * 24 * 3_600_000;

/** Result of one HTTP call through `t.fetch`. */
export interface HttpResult {
  status: number;
  headers: Headers;
  json: any;
  text: string;
}

/** Credential issued by the scripted device-code login. */
export interface LoginResult {
  token: string;
  handle: SessionId;
  credentialId: string;
  expiresAt: number;
  account: { userId: string; name: string; email?: string };
}

/** Options for {@link Gateway.login}. */
export interface LoginOptions {
  installationId?: string;
  machineName?: string;
  environment?: string;
}

/** Builds a fresh in-memory Convex test harness for the gateway. */
export function makeGateway() {
  const t: TestConvex<typeof schema> = convexTest(schema, modules);
  /** Every response body returned through `post` (for hygiene assertions). */
  const responses: string[] = [];

  /** Builds the request init for a CLI call. */
  function requestInit(body: unknown, headers: Record<string, string>): RequestInit {
    const merged: Record<string, string> =
      body === undefined ? { ...headers } : { 'content-type': 'application/json', ...headers };
    const init: RequestInit = { method: 'POST', headers: merged };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    return init;
  }

  /** Parses a body, leaving malformed JSON undefined. */
  function parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  /** Posts to a route and asserts the response is never cacheable. */
  async function post(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<HttpResult> {
    const response = await t.fetch(path, requestInit(body, headers));
    const text = await response.text();
    responses.push(text);
    expect(response.headers.get('cache-control')).toBe('no-store');
    return { status: response.status, headers: response.headers, json: parseJson(text), text };
  }

  /** Calls one gateway op with a bearer token. */
  async function call(token: string, op: string, args?: unknown): Promise<HttpResult> {
    return post('/cli/v1/call', { op, args }, { authorization: `Bearer ${token}` });
  }

  /** Seeds a full user. */
  async function seedUser(name = 'Alice', email = 'alice@example.com'): Promise<Id<'users'>> {
    return t.run((ctx) => ctx.db.insert('users', { type: 'full', name, email }));
  }

  /** Seeds a browser session for a user. */
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

  /** Drives create → approve → poll with the real device-code flow. */
  async function login(userId: Id<'users'>, options: LoginOptions = {}): Promise<LoginResult> {
    const sessionId = await newBrowserSession(userId);
    const body: Record<string, unknown> = {
      installationId: options.installationId ?? crypto.randomUUID(),
      machineName: options.machineName ?? 'macbook-pro',
    };
    if (options.environment !== undefined) body.environment = options.environment;

    const created = await post('/cli/auth/requests', body);
    expect(created.status).toBe(201);
    const { requestId, deviceCode, userCode } = created.json as {
      requestId: string;
      deviceCode: string;
      userCode: string;
    };
    await expect(
      t.mutation(api.cli.auth.approveAuthorizationRequest, { sessionId, requestId, userCode })
    ).resolves.toEqual({ success: true });

    const exchanged = await post('/cli/auth/token', { requestId, deviceCode });
    expect(exchanged.status).toBe(200);
    expect(exchanged.json.status).toBe('approved');
    const token = exchanged.json.token as string;
    return {
      token,
      handle: (await deriveSessionHandle(token)) as SessionId,
      credentialId: exchanged.json.tokenId as string,
      expiresAt: exchanged.json.expiresAt as number,
      account: exchanged.json.account as LoginResult['account'],
    };
  }

  /** Creates a domain through the public mutation. */
  async function seedDomain(sessionId: SessionId, name = 'Health'): Promise<Id<'domains'>> {
    return t.mutation(api.domain.createDomain, { sessionId, name });
  }

  /** Creates an initiative through the public mutation. */
  async function seedInitiative(
    sessionId: SessionId,
    title = 'Ship v1'
  ): Promise<Id<'initiatives'>> {
    return t.mutation(api.initiative.createInitiative, {
      sessionId,
      title,
      startDate: NOW,
    });
  }

  /** Creates a quarterly goal through the public mutation. */
  async function seedQuarterlyGoal(
    sessionId: SessionId,
    args: { title: string; year: number; quarter: number; details?: string; dueDate?: number }
  ): Promise<Id<'goals'>> {
    return t.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      year: args.year,
      quarter: args.quarter,
      title: args.title,
      details: args.details,
      dueDate: args.dueDate,
      weekNumber: 30,
    });
  }

  /** Creates a weekly goal through the public mutation. */
  async function seedWeeklyGoal(
    sessionId: SessionId,
    args: { title: string; parentId: Id<'goals'>; week: number; details?: string }
  ): Promise<Id<'goals'>> {
    return t.mutation(api.dashboard.createWeeklyGoal, {
      sessionId,
      title: args.title,
      details: args.details,
      parentId: args.parentId,
      weekNumber: args.week,
    });
  }

  /** Creates a daily goal through the public mutation. */
  async function seedDailyGoal(
    sessionId: SessionId,
    args: {
      title: string;
      parentId: Id<'goals'>;
      week: number;
      dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    }
  ): Promise<Id<'goals'>> {
    return t.mutation(api.dashboard.createDailyGoal, {
      sessionId,
      title: args.title,
      parentId: args.parentId,
      weekNumber: args.week,
      dayOfWeek: args.dayOfWeek,
    });
  }

  /** Creates an adhoc goal through the public mutation. */
  async function seedAdhocGoal(
    sessionId: SessionId,
    args: { title: string; year: number; week: number; domainId?: Id<'domains'>; details?: string }
  ): Promise<Id<'goals'>> {
    return t.mutation(api.adhocGoal.createAdhocGoal, {
      sessionId,
      title: args.title,
      details: args.details,
      domainId: args.domainId,
      year: args.year,
      weekNumber: args.week,
    });
  }

  return {
    t,
    responses,
    post,
    call,
    seedUser,
    newBrowserSession,
    login,
    seedDomain,
    seedInitiative,
    seedQuarterlyGoal,
    seedWeeklyGoal,
    seedDailyGoal,
    seedAdhocGoal,
  };
}

/** A running gateway harness. */
export type Gateway = ReturnType<typeof makeGateway>;

/**
 * Reads a goal row, failing the test when it no longer exists.
 *
 * @param gateway - running harness
 * @param goalId - goal id to read
 */
export async function goalRow(gateway: Gateway, goalId: string) {
  const row = await gateway.t.run((ctx) => ctx.db.get('goals', goalId as Id<'goals'>));
  expect(row).not.toBeNull();
  return row;
}
