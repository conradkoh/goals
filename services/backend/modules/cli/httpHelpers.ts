/**
 * HTTP framing helpers shared by the CLI device-code routes.
 *
 * Lives outside `convex/` so both the login routes and the future `/cli/v1/call`
 * gateway handler can reuse it without moving code.
 *
 * Security invariants:
 *   - Every response is `Cache-Control: no-store`, so no proxy or browser cache
 *     can retain a token or a device code.
 *   - Error bodies are a fixed `{ error: { code, message } }` shape with a
 *     message chosen by code, so a response can never echo request content.
 *   - Bodies are rejected by declared length *before* being read, and by UTF-8
 *     byte length after, so the limit cannot be side-stepped with multi-byte
 *     characters.
 */

import type { CliErrorCode } from '@workspace/shared/utilities/cli-contract';

/** Wire error codes, identical to the shared contract. */
export type HttpErrorCode = CliErrorCode;

/** Fixed client-facing message per error code. Never derived from request content. */
const ERROR_MESSAGES: Record<HttpErrorCode, string> = {
  invalid_argument: 'Invalid request',
  unauthorized: 'Unauthorized',
  forbidden: 'Forbidden',
  not_found: 'Not found',
  conflict: 'Conflict',
  rate_limited: 'Too many requests',
  payload_too_large: 'Request body too large',
  login_disabled: 'Login is currently disabled',
  internal: 'Internal error',
};

/** Returns the fixed message for `code`; safe to include in a body. */
export function errorMessage(code: HttpErrorCode): string {
  return ERROR_MESSAGES[code];
}

/** Headers every CLI response carries. */
const BASE_HEADERS = { 'cache-control': 'no-store' };

/**
 * Builds a JSON response that is never cached.
 *
 * @param status - HTTP status code
 * @param body - JSON-serialisable payload
 * @param extraHeaders - additional headers (e.g. `retry-after`)
 */
export function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...BASE_HEADERS, ...extraHeaders },
  });
}

/**
 * Builds a JSON error response with the fixed message for `code`.
 *
 * @param status - HTTP status code
 * @param code - wire error code
 * @param extraHeaders - additional headers (e.g. `retry-after`)
 * @param message - gateway-authored literal overriding the fixed message
 */
export function errorResponse(
  status: number,
  code: HttpErrorCode,
  extraHeaders?: Record<string, string>,
  message?: string
): Response {
  return jsonResponse(
    status,
    { error: { code, message: message ?? ERROR_MESSAGES[code] } },
    extraHeaders
  );
}

/** Parsed body, or the response to return instead of parsing. */
export type ReadJsonResult = { ok: true; value: unknown } | { ok: false; response: Response };

/** True when the header declares `application/json` (charset suffix allowed). */
function isJsonContentType(header: string | null): boolean {
  return header !== null && header.trim().toLowerCase().startsWith('application/json');
}

/** True when a declared `content-length` exceeds `limit` (invalid values are ignored). */
function declaredLengthExceeds(header: string | null, limit: number): boolean {
  if (header === null) return false;
  const declared = Number(header);
  return Number.isFinite(declared) && declared > limit;
}

/** UTF-8 byte length of a string. */
function utf8Length(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

/** Parses JSON, mapping a syntax error to a 400 response. */
function parseJsonBody(text: string): ReadJsonResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: errorResponse(400, 'invalid_argument') };
  }
}

/**
 * Reads and parses a JSON request body.
 *
 * @param request - incoming request
 * @param limit - maximum body size in bytes
 * @returns the parsed JSON, or the response to send instead
 */
export async function readJson(request: Request, limit: number): Promise<ReadJsonResult> {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return { ok: false, response: errorResponse(415, 'invalid_argument') };
  }
  if (declaredLengthExceeds(request.headers.get('content-length'), limit)) {
    return { ok: false, response: errorResponse(413, 'payload_too_large') };
  }
  const text = await request.text();
  if (utf8Length(text) > limit) {
    return { ok: false, response: errorResponse(413, 'payload_too_large') };
  }
  return parseJsonBody(text);
}
