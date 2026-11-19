import type { StoredCredential } from './credentials.js';
import { CliError, safeMessage } from './errors.js';
import type {
  CliOpMap,
  CliOpName,
  LoginRequestBody,
  LoginRequestResponse,
  TokenExchangeResponse,
} from './vendor/cli-contract/index.js';

export interface ApiClientDeps {
  fetch: typeof fetch;
  /** Default 30000. */
  timeoutMs?: number;
}

export interface ApiClient {
  createLoginRequest(
    base: { convexUrl: string },
    body: LoginRequestBody,
    signal?: AbortSignal
  ): Promise<LoginRequestResponse>;
  exchangeLoginRequest(
    base: { convexUrl: string },
    body: { requestId: string; deviceCode: string },
    signal?: AbortSignal
  ): Promise<TokenExchangeResponse>;
  revoke(
    credential: Pick<StoredCredential, 'convexUrl' | 'token'>
  ): Promise<'revoked' | 'already-invalid'>;
  call<K extends CliOpName>(
    credential: Pick<StoredCredential, 'convexUrl' | 'token'>,
    op: K,
    args: CliOpMap[K]['args']
  ): Promise<CliOpMap[K]['result']>;
}

const INVALID_RESPONSE = 'Invalid Goals response';
const UNAUTHORIZED = 'Credentials are invalid, expired or revoked; run `goals auth login` again.';
const NETWORK_FAILURE = 'Unable to contact Goals; please retry.';
const TIMEOUT_FAILURE = 'Goals did not respond in time; please retry.';

type FieldType = 'string' | 'number';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasFields(record: Record<string, unknown>, fields: Record<string, FieldType>): boolean {
  return Object.entries(fields).every(([key, type]) =>
    type === 'string' ? isString(record[key]) : isNumber(record[key])
  );
}

const LOGIN_REQUEST_FIELDS: Record<string, FieldType> = {
  requestId: 'string',
  deviceCode: 'string',
  userCode: 'string',
  expiresAt: 'number',
  intervalMs: 'number',
};

function isLoginRequestResponse(value: unknown): value is LoginRequestResponse {
  return isRecord(value) && hasFields(value, LOGIN_REQUEST_FIELDS);
}

const APPROVED_FIELDS: Record<string, FieldType> = {
  token: 'string',
  tokenId: 'string',
  expiresAt: 'number',
};

function isAccount(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const emailOk = value.email === undefined || isString(value.email);
  return hasFields(value, { userId: 'string', name: 'string' }) && emailOk;
}

function isApproved(
  value: unknown
): value is Extract<TokenExchangeResponse, { status: 'approved' }> {
  if (!isRecord(value) || value.status !== 'approved') return false;
  return hasFields(value, APPROVED_FIELDS) && isAccount(value.account);
}

function parseApproved(json: unknown): TokenExchangeResponse {
  if (!isApproved(json)) throw new CliError(INVALID_RESPONSE);
  return json;
}

function parsePending(json: unknown): TokenExchangeResponse {
  if (!isRecord(json) || !isNumber(json.intervalMs)) throw new CliError(INVALID_RESPONSE);
  return { status: 'pending', intervalMs: json.intervalMs };
}

function parseGone(json: unknown): TokenExchangeResponse {
  const consumed = isRecord(json) && json.status === 'consumed';
  return { status: consumed ? 'consumed' : 'expired' };
}

const EXCHANGE_PARSERS: Record<number, (json: unknown) => TokenExchangeResponse> = {
  200: parseApproved,
  202: parsePending,
  403: () => ({ status: 'denied' }),
  404: () => ({ status: 'not_found' }),
  410: parseGone,
};

function backendMessage(json: unknown): unknown {
  return isRecord(json) && isRecord(json.error) ? json.error.message : undefined;
}

function genericFailure(label: string, status: number, json: unknown): CliError {
  return new CliError(
    safeMessage(backendMessage(json), `Goals ${label} request failed (HTTP ${status})`)
  );
}

function parseExchange(status: number, json: unknown): TokenExchangeResponse {
  const parser = EXCHANGE_PARSERS[status];
  if (parser === undefined) throw genericFailure('login poll', status, json);
  return parser(json);
}

function parseCallData(json: unknown): unknown {
  if (!isRecord(json) || json.ok !== true) throw new CliError(INVALID_RESPONSE);
  return json.data;
}

function parseCall(status: number, op: string, json: unknown): unknown {
  if (status === 200) return parseCallData(json);
  if (status === 401) throw new CliError(UNAUTHORIZED);
  throw genericFailure(op, status, json);
}

interface SendRequest {
  origin: string;
  path: string;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

interface SendResponse {
  status: number;
  json: unknown;
}

function requestHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-store',
  };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function requestInit(request: SendRequest, signal: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: requestHeaders(request.token),
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    redirect: 'error',
    signal,
  };
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Forwards an optional caller signal into the request controller; returns the listener. */
function linkAbort(controller: AbortController, external?: AbortSignal): () => void {
  const forward = () => controller.abort();
  external?.addEventListener('abort', forward, { once: true });
  if (external?.aborted) controller.abort();
  return forward;
}

/** One POST that owns its timeout, cancellation and body read. */
function createSend(deps: ApiClientDeps, timeoutMs: number) {
  return async function send(request: SendRequest): Promise<SendResponse> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const forwardAbort = linkAbort(controller, request.signal);
    try {
      const url = new URL(request.path, request.origin).toString();
      const response = await deps.fetch(url, requestInit(request, controller.signal));
      return { status: response.status, json: await readJsonBody(response) };
    } catch {
      throw new CliError(timedOut ? TIMEOUT_FAILURE : NETWORK_FAILURE);
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', forwardAbort);
    }
  };
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  const send = createSend(deps, deps.timeoutMs ?? 30000);

  return {
    async createLoginRequest(base, body, signal) {
      const { status, json } = await send({
        origin: base.convexUrl,
        path: '/cli/auth/requests',
        body,
        signal,
      });
      if (status === 201) {
        if (!isLoginRequestResponse(json)) throw new CliError(INVALID_RESPONSE);
        return json;
      }
      if (status === 429) throw new CliError('Too many login attempts; wait a minute and retry.');
      throw genericFailure('login', status, json);
    },

    async exchangeLoginRequest(base, body, signal) {
      const { status, json } = await send({
        origin: base.convexUrl,
        path: '/cli/auth/token',
        body,
        signal,
      });
      return parseExchange(status, json);
    },

    async revoke(credential) {
      const { status, json } = await send({
        origin: credential.convexUrl,
        path: '/cli/auth/revoke',
        token: credential.token,
      });
      if (status === 200) return 'revoked';
      if (status === 401) return 'already-invalid';
      throw genericFailure('logout', status, json);
    },

    async call<K extends CliOpName>(
      credential: Pick<StoredCredential, 'convexUrl' | 'token'>,
      op: K,
      args: CliOpMap[K]['args']
    ) {
      const { status, json } = await send({
        origin: credential.convexUrl,
        path: '/cli/v1/call',
        token: credential.token,
        body: { op, args },
      });
      return parseCall(status, op, json) as CliOpMap[K]['result'];
    },
  };
}
