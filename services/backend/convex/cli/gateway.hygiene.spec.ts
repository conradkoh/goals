/**
 * Gateway secret-hygiene spec.
 *
 * The flow runs every op family and every failure class while spying on the
 * console. Separately, `mapError` is exercised with literal errors to prove no
 * called-function message can reach a response.
 */

import { ConvexError } from 'convex/values';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { mapError } from '../../modules/cli/gateway/call';
import { makeGateway, NOW, type Gateway } from '../../modules/cli/gateway/testKit';
import { hashHandle } from '../../modules/cli/tokenCrypto';

let g: Gateway;

beforeEach(() => {
  g = makeGateway();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Joins every console argument captured by the spies. */
function consoleText(spies: { mock: { calls: unknown[][] } }[]): string {
  return spies
    .flatMap((spy) => spy.mock.calls)
    .flat()
    .map((argument: unknown) =>
      typeof argument === 'string' ? argument : JSON.stringify(argument)
    )
    .join('\n');
}

describe('secret hygiene', () => {
  test('never logs or returns a token, handle or handle hash', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'debug'),
    ];

    const user = await g.seedUser('Alice', 'alice@example.com');
    const { token, handle } = await g.login(user);
    const authorization = `Bearer ${token}`;
    const handleHash = await hashHandle(handle);

    const callTexts: string[] = [];
    const record = async <T extends { text: string }>(promise: Promise<T>): Promise<T> => {
      const result = await promise;
      callTexts.push(result.text);
      return result;
    };

    await record(g.call(token, 'auth.whoami'));
    await record(g.call(token, 'goal.list', { scope: 'quarterly', year: 2026, quarter: 3 }));
    const created = await record(
      g.call(token, 'goal.create', {
        scope: 'quarterly',
        title: 'Grow revenue',
        year: 2026,
        quarter: 3,
      })
    );
    const goalId = created.json.data.id as string;
    await record(g.call(token, 'goal.rename', { id: goalId, title: 'Grow revenue fast' }));
    await record(g.call(token, 'goal.setComplete', { id: goalId, isComplete: true }));
    await record(
      g.call(token, 'goal.list', { scope: 'quarterly', year: 2026, quarter: 3, limit: 999 })
    );
    await record(g.call(token, 'goal.delete', { id: goalId }));
    await record(g.call(token, 'not.an.op', {}));
    await g.post('/cli/auth/revoke', undefined, { authorization });
    await record(g.call(token, 'auth.whoami'));

    const logged = consoleText(spies);
    for (const secret of [token, handle, handleHash, authorization]) {
      expect(logged).not.toContain(secret);
    }
    for (const body of callTexts) {
      expect(body).not.toContain(token);
      expect(body).not.toContain(handle);
      expect(body).not.toContain(handleHash);
    }
    for (const body of g.responses) {
      expect(body).not.toContain(handle);
      expect(body).not.toContain(handleHash);
      expect(body).not.toContain(authorization);
    }
  });
});

describe('mapError', () => {
  const CANARY = 'CANARY-do-not-leak';

  /** Asserts the body never carries the canary and returns its JSON. */
  async function bodyOf(error: unknown) {
    const response = mapError(error);
    const text = await response.text();
    expect(text).not.toContain(CANARY);
    return { status: response.status, json: JSON.parse(text) as unknown };
  }

  test('an unexpected error is a fixed 500', async () => {
    const { status, json } = await bodyOf(new Error(`boom ${CANARY}`));
    expect(status).toBe(500);
    expect(json).toEqual({
      ok: false,
      error: { code: 'internal', message: 'Request failed' },
    });
  });

  test('a plain auth error is 401', async () => {
    const { status, json } = await bodyOf(new Error('Login required'));
    expect(status).toBe(401);
    expect(json).toEqual({
      ok: false,
      error: { code: 'unauthorized', message: 'Unauthorized' },
    });
  });

  test('NOT_FOUND is 404', async () => {
    const { status, json } = await bodyOf(new ConvexError({ code: 'NOT_FOUND', message: CANARY }));
    expect(status).toBe(404);
    expect(json).toEqual({ ok: false, error: { code: 'not_found', message: 'Not found' } });
  });

  test('UNAUTHORIZED is 403', async () => {
    const { status, json } = await bodyOf(
      new ConvexError({ code: 'UNAUTHORIZED', message: CANARY })
    );
    expect(status).toBe(403);
    expect(json).toEqual({ ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  });

  test('an unmapped ConvexError code is a fixed 500', async () => {
    const { status, json } = await bodyOf(new ConvexError({ code: 'WHATEVER', message: CANARY }));
    expect(status).toBe(500);
    expect(json).toEqual({
      ok: false,
      error: { code: 'internal', message: 'Request failed' },
    });
  });
});
