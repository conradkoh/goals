import type { CliErrorCode, CliOpName } from '@workspace/shared/utilities/cli-contract';
import { ConvexError, type Value } from 'convex/values';
import type { SessionId } from 'convex-helpers/server/sessions';
import { z } from 'zod';

import { internal } from '../../../convex/_generated/api';
import type { ActionCtx } from '../../../convex/_generated/server';
import type { ResolvedHandle } from '../../../convex/cli/authInternal';
import { CLI_CALL_BODY_LIMIT, CLI_TOUCH_INTERVAL_MS } from '../constants';
import { errorMessage, jsonResponse, readJson } from '../httpHelpers';
import { bearerFromHeader, deriveSessionHandle } from '../tokenCrypto';
import { CliGatewayError } from './errors';
import { CLI_OPS, type OpCtx } from './registry';
/**
 * `POST /cli/v1/call` — the authenticated data gateway.
 *
 * Order is deliberate: authenticate, frame the body, resolve the op from a
 * closed registry, validate its strict arg schema, throttle the credential
 * touch, then run exactly one op against the existing public Convex functions
 * with the derived handle as `sessionId`. There is no second write path.
 *
 * Security invariants:
 *   - Only keys of `CLI_OPS` can run (`Object.hasOwn`), and no called function's
 *     message, zod issue text or argument value can reach a response.
 *   - Nothing is logged; a request never contains a secret in a body it emits.
 */

/** Envelope every call must match before an op can run. */
const CALL_BODY = z.strictObject({
  op: z.string().min(1).max(64),
  args: z.unknown().optional(),
});

/** Parsed envelope type. */
type CallEnvelope = z.infer<typeof CALL_BODY>;

/** Fixed error body in the shared `CliResponse` shape. */
function gatewayError(status: number, code: CliErrorCode, message?: string): Response {
  return jsonResponse(status, {
    ok: false,
    error: { code, message: message ?? errorMessage(code) },
  });
}

/** The exact 500 body; used by the route wrapper too. */
export function gatewayInternalError(): Response {
  return gatewayError(500, 'internal', 'Request failed');
}

/** Re-wraps a `readJson` rejection, keeping its status and choosing the code. */
function framingError(status: number): Response {
  return gatewayError(status, status === 413 ? 'payload_too_large' : 'invalid_argument');
}

/**
 * Builds the client-facing message from a zod failure.
 *
 * Only gateway-authored schema keys are used: unrecognised keys get a generic
 * message, so request content is never echoed.
 */
function argErrorMessage(error: z.ZodError): string {
  if (error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
    return 'Unknown argument';
  }
  const [first] = error.issues;
  if (first !== undefined && first.path.length > 0) {
    return `Invalid argument: ${first.path.map(String).join('.')}`;
  }
  return 'Invalid arguments';
}

/** Extracts `data.code` from a `ConvexError`, without trusting its message. */
function convexErrorCode(error: ConvexError<Value>): string | null {
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null) return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** Fixed gateway response per existing-function error code. */
const CONVEX_ERRORS: Record<string, [status: number, code: CliErrorCode]> = {
  NOT_FOUND: [404, 'not_found'],
  UNAUTHORIZED: [403, 'forbidden'],
  NOT_AUTHENTICATED: [401, 'unauthorized'],
  INVALID_ARGUMENT: [400, 'invalid_argument'],
  VALIDATION_ERROR: [400, 'invalid_argument'],
  CONFLICT: [409, 'conflict'],
};

/** Fixed gateway response per existing-function error code. */
function convexErrorResponse(code: string | null): Response {
  const entry = code === null ? undefined : CONVEX_ERRORS[code];
  return entry === undefined ? gatewayInternalError() : gatewayError(entry[0], entry[1]);
}

/** True for the plain authentication errors thrown by `requireLogin`. */
function isPlainAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('Login required') || error.message.includes('User not found'))
  );
}

/**
 * Maps any thrown value to a fixed response. Exported for the unit seam.
 *
 * No branch ever reads a message, `data.message` or a stack, so a called
 * function cannot leak its input through this path.
 */
// fallow-ignore-next-line unused-export
export function mapError(error: unknown): Response {
  if (error instanceof CliGatewayError) {
    return gatewayError(error.status, error.code, error.publicMessage);
  }
  if (error instanceof ConvexError) {
    return convexErrorResponse(convexErrorCode(error));
  }
  if (isPlainAuthError(error)) {
    return gatewayError(401, 'unauthorized');
  }
  return gatewayInternalError();
}

/** A valid JSON request body, or the response to return instead. */
async function readCallBody(request: Request): Promise<z.infer<typeof CALL_BODY> | Response> {
  const body = await readJson(request, CLI_CALL_BODY_LIMIT);
  if (!body.ok) return framingError(body.response.status);
  const parsed = CALL_BODY.safeParse(body.value);
  if (!parsed.success) return gatewayError(400, 'invalid_argument', 'Invalid request');
  return parsed.data;
}

/** Refreshes `lastUsedAt` at most once per interval; a failure is ignored. */
async function touchIfStale(ctx: ActionCtx, opCtx: OpCtx): Promise<void> {
  const lastUsedAt = opCtx.credential.lastUsedAt;
  if (lastUsedAt !== undefined && Date.now() - lastUsedAt < CLI_TOUCH_INTERVAL_MS) return;
  try {
    await ctx.runMutation(internal.cli.authInternal.touchCredential, {
      credentialId: opCtx.credentialId,
    });
  } catch {
    // Bookkeeping only: a failed touch never fails the op.
  }
}

/** True only for own registry keys, so `constructor` and `__proto__` stay unknown. */
function isCliOpName(op: string): op is CliOpName {
  return Object.prototype.hasOwnProperty.call(CLI_OPS, op);
}

/** Resolved credential plus its derived handle. */
interface Authenticated {
  handle: string;
  resolved: ResolvedHandle;
}

/** Authenticates the bearer credential, or returns the 401 to send. */
async function authenticate(ctx: ActionCtx, request: Request): Promise<Authenticated | Response> {
  const token = bearerFromHeader(request.headers.get('authorization'));
  if (token === null) return gatewayError(401, 'unauthorized');

  const handle = await deriveSessionHandle(token);
  const resolved = await ctx.runQuery(internal.cli.authInternal.resolveHandle, { handle });
  if (resolved === null) {
    return gatewayError(401, 'unauthorized', 'Invalid or revoked credential');
  }
  return { handle, resolved };
}

/** Resolves a parsed envelope to a known op with schema-validated args. */
function resolveCall(envelope: CallEnvelope): { op: CliOpName; args: unknown } | Response {
  if (!isCliOpName(envelope.op)) {
    return gatewayError(400, 'invalid_argument', 'Unknown op');
  }
  const parsed = CLI_OPS[envelope.op].args.safeParse(envelope.args ?? {});
  if (!parsed.success) return gatewayError(400, 'invalid_argument', argErrorMessage(parsed.error));
  return { op: envelope.op, args: parsed.data };
}

/** A validated `{op,args}` call, or the 400 to send. */
async function parseCall(request: Request): Promise<{ op: CliOpName; args: unknown } | Response> {
  const envelope = await readCallBody(request);
  if (envelope instanceof Response) return envelope;
  return resolveCall(envelope);
}

/** `POST /cli/v1/call` handler. Never throws; every failure is a mapped body. */
export async function callCliOp(ctx: ActionCtx, request: Request): Promise<Response> {
  const auth = await authenticate(ctx, request);
  if (auth instanceof Response) return auth;

  const call = await parseCall(request);
  if (call instanceof Response) return call;

  const opCtx: OpCtx = {
    ctx,
    handle: auth.handle as SessionId,
    userId: auth.resolved.userId,
    credentialId: auth.resolved.credentialId,
    credential: auth.resolved,
  };
  await touchIfStale(ctx, opCtx);

  try {
    const data: unknown = await CLI_OPS[call.op].run(opCtx, call.args as never);
    return jsonResponse(200, { ok: true, data });
  } catch (error) {
    return mapError(error);
  }
}
