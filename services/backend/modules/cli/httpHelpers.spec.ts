/**
 * Unit tests for the CLI HTTP framing helpers.
 *
 * The seam is the exported helper surface with real web `Request`/`Response`
 * objects; no Convex runtime is involved. These helpers are shared with the
 * future gateway handler, so the framing rules (no-store caching, JSON content
 * type, body limits) are pinned here independently of any route.
 */

import { describe, expect, test, vi } from 'vitest';

import type { HttpErrorCode } from './httpHelpers';
import { errorResponse, jsonResponse, readJson } from './httpHelpers';

const URL_ = 'https://some.convex.site/cli/auth/requests';
const LIMIT = 8_192;

/** Builds a JSON POST request, optionally overriding headers and body. */
function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('jsonResponse', () => {
  test('is JSON and never cached', async () => {
    const response = jsonResponse(201, { requestId: 'abc' });

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ requestId: 'abc' });
  });

  test('keeps no-store when extra headers are added', async () => {
    const response = jsonResponse(429, { ok: false }, { 'retry-after': '60' });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});

describe('errorResponse', () => {
  const cases: [HttpErrorCode, number, string][] = [
    ['invalid_argument', 400, 'Invalid request'],
    ['unauthorized', 401, 'Unauthorized'],
    ['forbidden', 403, 'Forbidden'],
    ['not_found', 404, 'Not found'],
    ['conflict', 409, 'Conflict'],
    ['rate_limited', 429, 'Too many requests'],
    ['payload_too_large', 413, 'Request body too large'],
    ['login_disabled', 503, 'Login is currently disabled'],
    ['internal', 500, 'Internal error'],
  ];

  test.each(cases)('maps %s to a fixed body', async (code, status, message) => {
    const response = errorResponse(status, code);

    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ error: { code, message } });
  });

  test('accepts extra headers', async () => {
    const response = errorResponse(429, 'rate_limited', { 'retry-after': '60' });

    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  test('accepts a gateway-authored message override', async () => {
    const response = errorResponse(401, 'unauthorized', undefined, 'Invalid or revoked credential');

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Invalid or revoked credential' },
    });
  });
});

describe('readJson', () => {
  test('parses a JSON body', async () => {
    await expect(readJson(jsonRequest('{"a":1}'), LIMIT)).resolves.toEqual({
      ok: true,
      value: { a: 1 },
    });
  });

  test('accepts a charset suffix and mixed case', async () => {
    const request = jsonRequest('{"a":1}', { 'content-type': 'Application/JSON; charset=utf-8' });

    await expect(readJson(request, LIMIT)).resolves.toEqual({ ok: true, value: { a: 1 } });
  });

  test('rejects a non-JSON content type', async () => {
    const result = await readJson(jsonRequest('{"a":1}', { 'content-type': 'text/plain' }), LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(415);
    await expect(result.response.json()).resolves.toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects a missing content type', async () => {
    const request = new Request(URL_, { method: 'POST', body: '{"a":1}' });

    const result = await readJson(request, LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(415);
  });

  test('rejects a declared content length over the limit without reading the body', async () => {
    const request = jsonRequest('{"a":1}', { 'content-length': String(LIMIT + 1) });
    const readBody = vi.fn(async () => '{"a":1}');
    Object.defineProperty(request, 'text', { value: readBody, configurable: true });

    const result = await readJson(request, LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(413);
    await expect(result.response.json()).resolves.toEqual({
      error: { code: 'payload_too_large', message: 'Request body too large' },
    });
    expect(readBody).not.toHaveBeenCalled();
  });

  test('measures body bytes, not characters, when no length is declared', async () => {
    // 3_000 characters, 9_000 UTF-8 bytes: under the character count, over the byte limit.
    const body = JSON.stringify({ pad: '€'.repeat(2_990) });
    expect(body.length).toBeLessThan(LIMIT);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(LIMIT);

    const result = await readJson(jsonRequest(body), LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(413);
  });

  test('accepts a body exactly at the limit', async () => {
    const body = '{"pad":"123456"}';
    expect(new TextEncoder().encode(body).byteLength).toBe(16);

    await expect(readJson(jsonRequest(body), 16)).resolves.toEqual({
      ok: true,
      value: { pad: '123456' },
    });
  });

  test('rejects invalid JSON', async () => {
    const result = await readJson(jsonRequest('{"a":'), LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({
      error: { code: 'invalid_argument', message: 'Invalid request' },
    });
  });

  test('rejects an empty body', async () => {
    const result = await readJson(jsonRequest(''), LIMIT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected rejection');
    expect(result.response.status).toBe(400);
  });
});
