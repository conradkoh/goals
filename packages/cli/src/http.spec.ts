import { describe, expect, it } from 'vitest';

import type { StoredCredential } from './credentials.js';
import { CliError } from './errors.js';
import { createApiClient } from './http.js';
import type { ApiClient, ApiClientDeps } from './http.js';

const TOKEN = 'secret-token-123';
const DEVICE_CODE = 'device-code-abc';
const CONVEX_URL = 'https://example-123.convex.site';

const credential: Pick<StoredCredential, 'convexUrl' | 'token'> = {
  convexUrl: CONVEX_URL,
  token: TOKEN,
};

interface Call {
  url: string;
  init: RequestInit;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(status: number, body: unknown): { calls: Call[]; fetch: typeof fetch } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return jsonResponse(status, body);
  }) as typeof fetch;
  return { calls, fetch: fetchImpl };
}

function client(deps: Partial<ApiClientDeps> & Pick<ApiClientDeps, 'fetch'>): ApiClient {
  return createApiClient(deps);
}

const LOGIN_REQUEST = {
  requestId: 'request-1',
  deviceCode: DEVICE_CODE,
  userCode: 'ABCD-EFGH',
  expiresAt: 1767225600000,
  intervalMs: 2000,
};

const APPROVED = {
  status: 'approved',
  token: TOKEN,
  tokenId: 'token-1',
  expiresAt: 1767225600000,
  account: { userId: 'user-1', name: 'Ada', email: 'ada@example.com' },
};

function headersOf(call: Call): Record<string, string> {
  return call.init.headers as Record<string, string>;
}

function bodyOf(call: Call): unknown {
  return JSON.parse(String(call.init.body));
}

describe('request shape', () => {
  it('posts a login request without a bearer token', async () => {
    const { calls, fetch } = stubFetch(201, LOGIN_REQUEST);
    const body = { installationId: 'installation-1', machineName: 'mac' };

    await client({ fetch }).createLoginRequest({ convexUrl: CONVEX_URL }, body);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${CONVEX_URL}/cli/auth/requests`);
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.redirect).toBe('error');
    expect(headersOf(calls[0] as Call)).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-store',
    });
    expect(bodyOf(calls[0] as Call)).toEqual(body);
  });

  it('posts a token exchange without a bearer token', async () => {
    const { calls, fetch } = stubFetch(200, APPROVED);
    const body = { requestId: 'request-1', deviceCode: DEVICE_CODE };

    await client({ fetch }).exchangeLoginRequest({ convexUrl: CONVEX_URL }, body);

    expect(calls[0]?.url).toBe(`${CONVEX_URL}/cli/auth/token`);
    expect(headersOf(calls[0] as Call).Authorization).toBeUndefined();
    expect(bodyOf(calls[0] as Call)).toEqual(body);
  });

  it('revokes with a bearer token and no body', async () => {
    const { calls, fetch } = stubFetch(200, { revoked: true });

    await client({ fetch }).revoke(credential);

    expect(calls[0]?.url).toBe(`${CONVEX_URL}/cli/auth/revoke`);
    expect(headersOf(calls[0] as Call).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]?.init.body).toBeUndefined();
  });

  it('calls a gateway op with a bearer token and {op, args}', async () => {
    const { calls, fetch } = stubFetch(200, { ok: true, data: { items: [], truncated: false } });
    const args = { scope: 'quarterly' as const, year: 2026 };

    await client({ fetch }).call(credential, 'goal.list', args);

    expect(calls[0]?.url).toBe(`${CONVEX_URL}/cli/v1/call`);
    expect(headersOf(calls[0] as Call).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(bodyOf(calls[0] as Call)).toEqual({ op: 'goal.list', args });
  });
});

describe('createLoginRequest', () => {
  it('returns the created request', async () => {
    const { fetch } = stubFetch(201, LOGIN_REQUEST);

    const result = await client({ fetch }).createLoginRequest(
      { convexUrl: CONVEX_URL },
      { installationId: 'installation-1', machineName: 'mac' }
    );

    expect(result).toEqual(LOGIN_REQUEST);
  });

  it('maps 429 to a fixed message', async () => {
    const { fetch } = stubFetch(429, { error: { code: 'rate_limited', message: 'Too many' } });

    await expect(
      client({ fetch }).createLoginRequest(
        { convexUrl: CONVEX_URL },
        { installationId: 'installation-1', machineName: 'mac' }
      )
    ).rejects.toThrow('Too many login attempts; wait a minute and retry.');
  });

  it('surfaces a safe backend message for other failures', async () => {
    const { fetch } = stubFetch(503, {
      error: { code: 'internal', message: 'Service unavailable' },
    });

    await expect(
      client({ fetch }).createLoginRequest(
        { convexUrl: CONVEX_URL },
        { installationId: 'installation-1', machineName: 'mac' }
      )
    ).rejects.toThrow('Service unavailable');
  });

  it('rejects a malformed 201 body', async () => {
    const { fetch } = stubFetch(201, { requestId: 'only-an-id' });

    await expect(
      client({ fetch }).createLoginRequest(
        { convexUrl: CONVEX_URL },
        { installationId: 'installation-1', machineName: 'mac' }
      )
    ).rejects.toThrow('Invalid Goals response');
  });
});

describe('exchangeLoginRequest', () => {
  it('returns an approved token', async () => {
    const { fetch } = stubFetch(200, APPROVED);

    const result = await client({ fetch }).exchangeLoginRequest(
      { convexUrl: CONVEX_URL },
      { requestId: 'request-1', deviceCode: DEVICE_CODE }
    );

    expect(result).toEqual(APPROVED);
  });

  it('rejects a malformed 200 body', async () => {
    const { fetch } = stubFetch(200, { status: 'approved', token: TOKEN });

    await expect(
      client({ fetch }).exchangeLoginRequest(
        { convexUrl: CONVEX_URL },
        { requestId: 'request-1', deviceCode: DEVICE_CODE }
      )
    ).rejects.toThrow('Invalid Goals response');
  });

  it('reports a pending poll', async () => {
    const { fetch } = stubFetch(202, { status: 'pending', intervalMs: 2000 });

    await expect(
      client({ fetch }).exchangeLoginRequest(
        { convexUrl: CONVEX_URL },
        { requestId: 'request-1', deviceCode: DEVICE_CODE }
      )
    ).resolves.toEqual({ status: 'pending', intervalMs: 2000 });
  });

  it('rejects a pending poll without an interval', async () => {
    const { fetch } = stubFetch(202, { status: 'pending' });

    await expect(
      client({ fetch }).exchangeLoginRequest(
        { convexUrl: CONVEX_URL },
        { requestId: 'request-1', deviceCode: DEVICE_CODE }
      )
    ).rejects.toThrow('Invalid Goals response');
  });

  it.each([
    [403, { status: 'denied' }, { status: 'denied' }],
    [404, { status: 'not_found' }, { status: 'not_found' }],
    [410, { status: 'expired' }, { status: 'expired' }],
    [410, { status: 'consumed' }, { status: 'consumed' }],
    [410, {}, { status: 'expired' }],
  ])('maps %i to %o', async (status, body, expected) => {
    const { fetch } = stubFetch(status, body);

    await expect(
      client({ fetch }).exchangeLoginRequest(
        { convexUrl: CONVEX_URL },
        { requestId: 'request-1', deviceCode: DEVICE_CODE }
      )
    ).resolves.toEqual(expected);
  });
});

describe('revoke', () => {
  it('reports a revoked credential', async () => {
    const { fetch } = stubFetch(200, { revoked: true });

    await expect(client({ fetch }).revoke(credential)).resolves.toBe('revoked');
  });

  it('treats 401 as already invalid', async () => {
    const { fetch } = stubFetch(401, { error: { code: 'unauthorized', message: 'Unauthorized' } });

    await expect(client({ fetch }).revoke(credential)).resolves.toBe('already-invalid');
  });

  it('rejects other failures', async () => {
    const { fetch } = stubFetch(500, { error: { code: 'internal', message: 'Boom' } });

    await expect(client({ fetch }).revoke(credential)).rejects.toThrow(CliError);
    await expect(client({ fetch }).revoke(credential)).rejects.toThrow('Boom');
  });
});

describe('call', () => {
  it('returns the op data', async () => {
    const data = { items: [], truncated: false };
    const { fetch } = stubFetch(200, { ok: true, data });

    await expect(
      client({ fetch }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).resolves.toEqual(data);
  });

  it('maps 401 to the re-login message', async () => {
    const { fetch } = stubFetch(401, { error: { code: 'unauthorized', message: 'Unauthorized' } });

    await expect(
      client({ fetch }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).rejects.toThrow('Credentials are invalid, expired or revoked; run `goals auth login` again.');
  });

  it('surfaces a safe backend error message', async () => {
    const { fetch } = stubFetch(400, {
      ok: false,
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });

    await expect(
      client({ fetch }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).rejects.toThrow('Invalid request');
  });

  it('replaces a secret-bearing backend message with the generic failure', async () => {
    const { fetch } = stubFetch(500, {
      ok: false,
      error: { code: 'internal', message: 'bad token handle' },
    });

    await expect(
      client({ fetch }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).rejects.toThrow('Goals goal.list request failed (HTTP 500)');
  });

  it('rejects a non-JSON 200', async () => {
    const fetchImpl = (async () => new Response('not json', { status: 200 })) as typeof fetch;

    await expect(
      client({ fetch: fetchImpl }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).rejects.toThrow('Invalid Goals response');
  });

  it('maps a network failure to a fixed message', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;

    await expect(
      client({ fetch: fetchImpl }).call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
    ).rejects.toThrow('Unable to contact Goals; please retry.');
  });

  it('times out a fetch that never responds', async () => {
    const fetchImpl = ((_input: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new TypeError('aborted')));
      })) as typeof fetch;

    await expect(
      client({ fetch: fetchImpl, timeoutMs: 20 }).call(credential, 'goal.list', {
        scope: 'quarterly',
        year: 2026,
      })
    ).rejects.toThrow('Goals did not respond in time; please retry.');
  });

  it('rejects when the caller aborts', async () => {
    const fetchImpl = ((_input: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new TypeError('aborted')));
      })) as typeof fetch;
    const controller = new AbortController();

    const pending = client({ fetch: fetchImpl }).createLoginRequest(
      { convexUrl: CONVEX_URL },
      { installationId: 'installation-1', machineName: 'mac' },
      controller.signal
    );
    controller.abort();

    await expect(pending).rejects.toThrow(CliError);
  });
});

describe('secret hygiene', () => {
  it('never puts the token or device code in a thrown message', async () => {
    const failures: ApiClientDeps[] = [
      { fetch: stubFetch(500, { error: { message: 'Boom' } }).fetch },
      { fetch: stubFetch(400, { error: { message: 'Invalid request' } }).fetch },
      { fetch: stubFetch(500, { error: { message: `bad ${TOKEN}` } }).fetch },
    ];

    for (const deps of failures) {
      const api = client(deps);
      const messages = await Promise.all([
        api.revoke(credential).catch((error: Error) => error.message),
        api
          .exchangeLoginRequest(
            { convexUrl: CONVEX_URL },
            { requestId: 'request-1', deviceCode: DEVICE_CODE }
          )
          .catch((error: Error) => error.message),
        api
          .call(credential, 'goal.list', { scope: 'quarterly', year: 2026 })
          .catch((error: Error) => error.message),
      ]);

      for (const message of messages) {
        expect(message).not.toContain(TOKEN);
        expect(message).not.toContain(DEVICE_CODE);
      }
    }
  });
});
