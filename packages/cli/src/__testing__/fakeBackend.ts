import { randomBytes, randomUUID } from 'node:crypto';

export interface FakeUser {
  userId: string;
  name: string;
  email?: string;
}

export interface FakeBackendOptions {
  /** The harness clock. */
  now: () => number;
  user?: FakeUser;
  /** Pending answers before the outcome (default 1). */
  pendingPolls?: number;
  outcome?: 'approve' | 'deny' | 'expire' | 'consume' | 'not_found';
  intervalMs?: number;
  requestTtlMs?: number;
  /** Force a status on POST /cli/auth/requests (e.g. 429, 503, 500). */
  createStatus?: number;
  /** Make fetch reject (network failure). */
  failNetwork?: boolean;
}

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A login request as the backend created it; lets specs assert the exact printed values. */
export interface CreatedLogin {
  requestId: string;
  deviceCode: string;
  userCode: string;
  expiresAt: number;
}

export interface FakeBackend {
  fetch: typeof fetch;
  requests: RecordedRequest[];
  /** Every secret handed out, for leak assertions. */
  issued: { token: string; deviceCode: string }[];
  /** Every login request created, with the values sent back to the CLI. */
  created: CreatedLogin[];
  setUser(user: FakeUser): void;
  setOutcome(outcome: FakeBackendOptions['outcome']): void;
  setFailNetwork(value: boolean): void;
  /** Tokens revoked via POST /cli/auth/revoke. */
  revoked: Set<string>;
  /** Server-side revocation (the credential then gets 401). */
  invalidate(token: string): void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVAL_TTL_MS = 180 * DAY_MS;
const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface PendingLogin {
  deviceCode: string;
  userCode: string;
  expiresAt: number;
  intervalMs: number;
  machineName: string;
  environment?: string;
  polls: number;
  consumed: boolean;
  issued: { token: string; deviceCode: string };
}

interface IssuedToken {
  token: string;
  tokenId: string;
  userId: string;
  name: string;
  email?: string;
  machineName: string;
  environment?: string;
  createdAt: number;
  expiresAt: number;
}

interface BackendState {
  user: FakeUser;
  outcome: NonNullable<FakeBackendOptions['outcome']>;
  pendingPolls: number;
  intervalMs: number;
  requestTtlMs: number;
  createStatus: number | undefined;
  failNetwork: boolean;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function headerRecord(headers: RequestInit['headers']): Record<string, string> {
  if (headers === undefined) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([name, value]) => [name, String(value)]));
  }
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name] = typeof value === 'string' ? value : value.join(', ');
  }
  return result;
}

function parseBody(body: RequestInit['body']): unknown {
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function randomUserCode(): string {
  const pick = (count: number): string =>
    Array.from(
      randomBytes(count),
      (byte) => USER_CODE_ALPHABET[byte % USER_CODE_ALPHABET.length]
    ).join('');
  return `${pick(4)}-${pick(4)}`;
}

interface RecordedBody {
  installationId?: string;
  machineName?: string;
  environment?: string;
  requestId?: string;
  deviceCode?: string;
  op?: string;
}

function recordBody(body: unknown): RecordedBody {
  return (typeof body === 'object' && body !== null ? body : {}) as RecordedBody;
}

export function createFakeBackend(options: FakeBackendOptions): FakeBackend {
  const state: BackendState = {
    user: options.user ?? { userId: 'user_1', name: 'Ada Lovelace' },
    outcome: options.outcome ?? 'approve',
    pendingPolls: options.pendingPolls ?? 1,
    intervalMs: options.intervalMs ?? 2000,
    requestTtlMs: options.requestTtlMs ?? 600000,
    createStatus: options.createStatus,
    failNetwork: options.failNetwork ?? false,
  };

  const requests = new Map<string, PendingLogin>();
  const tokens = new Map<string, IssuedToken>();
  const recorded: RecordedRequest[] = [];
  const issued: { token: string; deviceCode: string }[] = [];
  const created: CreatedLogin[] = [];
  const revoked = new Set<string>();
  let credentialCount = 0;

  function bearerToken(init: RequestInit): string | undefined {
    const authorization = headerRecord(init.headers).Authorization ?? '';
    return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
  }

  function activeToken(init: RequestInit): IssuedToken | undefined {
    const token = bearerToken(init);
    if (token === undefined || revoked.has(token)) return undefined;
    return tokens.get(token);
  }

  function createLogin(body: unknown): Response {
    if (state.createStatus !== undefined) {
      return jsonResponse(state.createStatus, {
        error: { code: 'internal', message: 'forced failure' },
      });
    }
    const fields = recordBody(body);
    const issuedRecord = { token: '', deviceCode: randomBytes(32).toString('hex') };
    issued.push(issuedRecord);
    const login: PendingLogin = {
      deviceCode: issuedRecord.deviceCode,
      userCode: randomUserCode(),
      expiresAt: options.now() + state.requestTtlMs,
      intervalMs: state.intervalMs,
      machineName: fields.machineName ?? '',
      polls: 0,
      consumed: false,
      issued: issuedRecord,
    };
    if (fields.environment !== undefined) login.environment = fields.environment;
    const requestId = randomUUID();
    requests.set(requestId, login);
    created.push({
      requestId,
      deviceCode: login.deviceCode,
      userCode: login.userCode,
      expiresAt: login.expiresAt,
    });
    return jsonResponse(201, {
      requestId,
      deviceCode: login.deviceCode,
      userCode: login.userCode,
      expiresAt: login.expiresAt,
      intervalMs: login.intervalMs,
    });
  }

  function approve(login: PendingLogin): Response {
    login.consumed = true;
    credentialCount += 1;
    const token = `tok_${randomBytes(18).toString('hex')}`;
    const tokenId = `cred_${credentialCount}`;
    const createdAt = options.now();
    const expiresAt = createdAt + APPROVAL_TTL_MS;
    login.issued.token = token;
    tokens.set(token, {
      token,
      tokenId,
      userId: state.user.userId,
      name: state.user.name,
      ...(state.user.email === undefined ? {} : { email: state.user.email }),
      machineName: login.machineName,
      ...(login.environment === undefined ? {} : { environment: login.environment }),
      createdAt,
      expiresAt,
    });
    return jsonResponse(200, {
      status: 'approved',
      token,
      tokenId,
      expiresAt,
      account: { ...state.user },
    });
  }

  function settle(login: PendingLogin): Response {
    switch (state.outcome) {
      case 'deny':
        return jsonResponse(403, { status: 'denied' });
      case 'expire':
        return jsonResponse(410, { status: 'expired' });
      case 'consume':
        return jsonResponse(410, { status: 'consumed' });
      case 'not_found':
        return jsonResponse(404, { status: 'not_found' });
      default:
        return approve(login);
    }
  }

  function exchange(body: unknown): Response {
    const fields = recordBody(body);
    const login = fields.requestId === undefined ? undefined : requests.get(fields.requestId);
    if (login === undefined || login.deviceCode !== fields.deviceCode) {
      return jsonResponse(404, { status: 'not_found' });
    }
    if (login.consumed) return jsonResponse(410, { status: 'consumed' });
    if (login.polls < state.pendingPolls) {
      login.polls += 1;
      return jsonResponse(202, { status: 'pending', intervalMs: login.intervalMs });
    }
    return settle(login);
  }

  function revoke(init: RequestInit): Response {
    const token = activeToken(init);
    if (token === undefined) {
      return jsonResponse(401, { error: { code: 'unauthorized', message: 'Unauthorized' } });
    }
    revoked.add(token.token);
    return jsonResponse(200, { revoked: true });
  }

  function whoami(token: IssuedToken): unknown {
    return {
      userId: token.userId,
      name: token.name,
      ...(token.email === undefined ? {} : { email: token.email }),
      credentialId: token.tokenId,
      machineName: token.machineName,
      ...(token.environment === undefined ? {} : { environment: token.environment }),
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    };
  }

  function call(init: RequestInit, body: unknown): Response {
    const token = activeToken(init);
    if (token === undefined) {
      return jsonResponse(401, {
        ok: false,
        error: { code: 'unauthorized', message: 'Unauthorized' },
      });
    }
    if (recordBody(body).op !== 'auth.whoami') {
      return jsonResponse(400, {
        ok: false,
        error: { code: 'invalid_argument', message: 'Unknown operation' },
      });
    }
    return jsonResponse(200, { ok: true, data: whoami(token) });
  }

  function route(url: URL, init: RequestInit, body: unknown): Response {
    switch (url.pathname) {
      case '/cli/auth/requests':
        return createLogin(body);
      case '/cli/auth/token':
        return exchange(body);
      case '/cli/auth/revoke':
        return revoke(init);
      case '/cli/v1/call':
        return call(init, body);
      default:
        return jsonResponse(404, { error: { code: 'not_found', message: 'Not found' } });
    }
  }

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const requestInit = init ?? {};
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    );
    const body = parseBody(requestInit.body);
    recorded.push({
      method: requestInit.method ?? 'GET',
      url: url.toString(),
      headers: headerRecord(requestInit.headers),
      body,
    });
    if (state.failNetwork) throw new TypeError('fetch failed');
    return route(url, requestInit, body);
  }) as typeof fetch;

  return {
    fetch: fetchImpl,
    requests: recorded,
    issued,
    created,
    setUser: (user) => {
      state.user = user;
    },
    setOutcome: (outcome) => {
      state.outcome = outcome ?? 'approve';
    },
    setFailNetwork: (value) => {
      state.failNetwork = value;
    },
    revoked,
    invalidate: (token) => {
      revoked.add(token);
    },
  };
}
