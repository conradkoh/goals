import { z } from 'zod';

import type { CreateRequestResult, PollResult } from './authInternal';
import {
  CLI_POLL_INTERVAL_MS,
  CLI_RATE_LIMIT_RETRY_AFTER_S,
  CLI_UNAUTH_BODY_LIMIT,
} from '../../modules/cli/constants';
import { errorResponse, jsonResponse, readJson } from '../../modules/cli/httpHelpers';
import {
  bearerFromHeader,
  deriveSessionHandle,
  generateDeviceCode,
  generateRequestId,
  generateToken,
  generateUserCode,
  hashDeviceCode,
  hashHandle,
} from '../../modules/cli/tokenCrypto';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { httpAction } from '../_generated/server';

/**
 * Unauthenticated HTTP routes of the CLI device-code login.
 *
 * Handlers are deliberately thin: read and validate the body, generate and
 * hash randomness, run exactly one internal mutation, then map its result to a
 * status. All state lives in `cli/authInternal`; all framing lives in
 * `modules/cli/httpHelpers`.
 *
 * Security invariants:
 *   - The bearer token appears in exactly one response: the 200 token exchange.
 *   - The device code appears in exactly one response: the 201 create.
 *   - Handle, handle hash, device-code hash and user code never appear in any
 *     response; the user code reaches the human through the terminal only.
 *   - Unknown request ids and wrong device codes both yield the identical 404.
 *   - Nothing is logged: there is no `console` call in this module, and a
 *     failure is reported as a generic 500 without its message.
 */

/** Body of `POST /cli/auth/requests`. */
const CREATE_BODY = z.strictObject({
  installationId: z.string().regex(/^[0-9a-f-]{36}$/i),
  machineName: z
    .string()
    .max(256)
    .transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, '').trim())
    .pipe(z.string().min(1).max(64)),
  environment: z
    .string()
    .max(256)
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9._-]{1,64}$/))
    .optional(),
});

/** Body of `POST /cli/auth/token`. */
const TOKEN_BODY = z.strictObject({
  requestId: z.string().regex(/^[0-9a-f-]{36}$/i),
  deviceCode: z.string().regex(/^[0-9a-f]{64}$/),
});

/**
 * Reads a size-limited JSON body and validates it.
 * Returns the parsed input, or the response to send instead. Zod issue text is
 * never included, so a response cannot echo request content.
 */
async function readValidatedBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  const body = await readJson(request, CLI_UNAUTH_BODY_LIMIT);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  return parsed.success ? parsed.data : errorResponse(400, 'invalid_argument');
}

/** Response for a rejected login request creation. */
function createFailure(reason: 'login_disabled' | 'rate_limited'): Response {
  if (reason === 'rate_limited') {
    return errorResponse(429, 'rate_limited', {
      'retry-after': String(CLI_RATE_LIMIT_RETRY_AFTER_S),
    });
  }
  return errorResponse(503, 'login_disabled');
}

/** Account block returned on approval; `email` is omitted for anonymous users. */
function accountBody(user: { userId: Id<'users'>; name: string; email?: string }) {
  if (user.email === undefined) return { userId: user.userId, name: user.name };
  return { userId: user.userId, name: user.name, email: user.email };
}

/** Response for the token exchange that issued a credential. */
function approvedResponse(
  result: Extract<PollResult, { status: 'approved' }>,
  token: string
): Response {
  return jsonResponse(200, {
    status: 'approved',
    token,
    tokenId: result.credentialId,
    expiresAt: result.expiresAt,
    account: accountBody(result.user),
  });
}

/** Response for every poll outcome that issues no credential. */
function pollStatusResponse(status: Exclude<PollResult['status'], 'approved'>): Response {
  if (status === 'pending') {
    return jsonResponse(202, { status: 'pending', intervalMs: CLI_POLL_INTERVAL_MS });
  }
  if (status === 'denied') return jsonResponse(403, { status: 'denied' });
  if (status === 'not_found') return jsonResponse(404, { status: 'not_found' });
  return jsonResponse(410, { status });
}

/** Maps a poll outcome to its HTTP response; only `approved` carries the token. */
function tokenResponse(result: PollResult, token: string): Response {
  if (result.status === 'approved') return approvedResponse(result, token);
  return pollStatusResponse(result.status);
}

/**
 * `POST /cli/auth/requests` — starts a login.
 *
 * Returns the device code (once), the user code the human types into the
 * browser, and the poll interval. No verification URL is returned: the CLI
 * builds it from its own configured web URL.
 */
export const cliAuthRequestsHandler = httpAction(async (ctx, request): Promise<Response> => {
  try {
    const input = await readValidatedBody(request, CREATE_BODY);
    if (input instanceof Response) return input;

    const requestId = generateRequestId();
    const deviceCode = generateDeviceCode();
    const userCode = generateUserCode();
    const result: CreateRequestResult = await ctx.runMutation(
      internal.cli.authInternal.createRequest,
      {
        requestId,
        deviceCodeHash: await hashDeviceCode(deviceCode),
        userCode,
        installationId: input.installationId,
        machineName: input.machineName,
        environment: input.environment,
      }
    );
    if (!result.ok) return createFailure(result.reason);

    return jsonResponse(201, {
      requestId,
      deviceCode,
      userCode,
      expiresAt: result.expiresAt,
      intervalMs: CLI_POLL_INTERVAL_MS,
    });
  } catch {
    return errorResponse(500, 'internal');
  }
});

/**
 * `POST /cli/auth/token` — polls a login and, once approved, exchanges it for a
 * bearer token.
 *
 * The response depends only on the mutation result, so an unknown request id
 * and a wrong device code are indistinguishable.
 */
export const cliAuthTokenHandler = httpAction(async (ctx, request): Promise<Response> => {
  try {
    const input = await readValidatedBody(request, TOKEN_BODY);
    if (input instanceof Response) return input;

    const token = generateToken();
    const handle = await deriveSessionHandle(token);
    const result: PollResult = await ctx.runMutation(internal.cli.authInternal.pollOrConsume, {
      requestId: input.requestId,
      deviceCodeHash: await hashDeviceCode(input.deviceCode),
      candidateHandleHash: await hashHandle(handle),
    });
    return tokenResponse(result, token);
  } catch {
    return errorResponse(500, 'internal');
  }
});

/**
 * `POST /cli/auth/revoke` — logs a CLI out.
 *
 * Does not read a body: the bearer token is the whole request. An unknown or
 * already-revoked credential is a 401, which the CLI treats as already logged
 * out.
 */
export const cliAuthRevokeHandler = httpAction(async (ctx, request): Promise<Response> => {
  try {
    const token = bearerFromHeader(request.headers.get('authorization'));
    if (token === null) return errorResponse(401, 'unauthorized');

    const result: { revoked: boolean } = await ctx.runMutation(
      internal.cli.authInternal.revokeByHandle,
      { handle: await deriveSessionHandle(token) }
    );
    return result.revoked
      ? jsonResponse(200, { revoked: true })
      : errorResponse(401, 'unauthorized');
  } catch {
    return errorResponse(500, 'internal');
  }
});
