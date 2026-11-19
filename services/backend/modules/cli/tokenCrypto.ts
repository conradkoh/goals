/**
 * Web-Crypto-only primitives for `goals` CLI credentials.
 *
 * Deliberately free of `node:*` imports and the `'use node'` directive so the
 * same code runs inside Convex queries/mutations/actions (default runtime) and
 * in the edge-runtime vitest environment.
 *
 * Security model:
 *   - The bearer token (`gcl_…`) exists only on the CLI machine.
 *   - The server derives a session handle in memory and stores only its hash.
 *   - Domain-separated prefixes prevent a digest from one purpose being
 *     replayed in another.
 */

const DEVICE_CODE_DOMAIN = 'goals-cli:device:v1:';
const HANDLE_DOMAIN = 'goals-cli:handle:v1:';
const HANDLE_LOOKUP_DOMAIN = 'goals-cli:handle-lookup:v1:';

/** Converts a digest buffer to lowercase hex. */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Encodes bytes as unpadded base64url. */
function toBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 of a UTF-8 string, lowercase hex. */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(digest);
}

/**
 * Generates a bearer token: `gcl_` followed by 32 random bytes as unpadded
 * base64url (exactly 43 characters).
 *
 * The token is shown to the CLI machine once and never persisted server-side.
 */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `gcl_${toBase64Url(bytes)}`;
}

/**
 * Generates a high-entropy device code: 32 random bytes as 64 lowercase hex
 * characters. Only its hash is stored.
 */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export function generateDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes.buffer);
}

/**
 * Generates a six-digit user code in the range `100000`–`999999` using
 * rejection sampling over a `Uint32`, so there is no modulo bias.
 */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export function generateUserCode(): string {
  const limit = Math.floor(0x100000000 / 900000) * 900000;
  const draw = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(draw);
    x = draw[0];
  } while (x >= limit);
  return String(100000 + (x % 900000));
}

/** Generates a request id as a random UUID v4. */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/** Hashes a device code for storage: `sha256hex('goals-cli:device:v1:' + code)`. */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export async function hashDeviceCode(code: string): Promise<string> {
  return sha256Hex(DEVICE_CODE_DOMAIN + code);
}

/**
 * Derives the transient session handle presented to Convex functions:
 * `'cli_' + sha256hex('goals-cli:handle:v1:' + token)`.
 *
 * The handle is never stored; `requireLogin` re-derives its lookup hash.
 */
// consumed by the CLI device-code mutation in Pass 2.
// fallow-ignore-next-line unused-export
export async function deriveSessionHandle(token: string): Promise<string> {
  return `cli_${await sha256Hex(HANDLE_DOMAIN + token)}`;
}

/** Hashes a session handle for indexed lookup: `sha256hex('goals-cli:handle-lookup:v1:' + handle)`. */
export async function hashHandle(handle: string): Promise<string> {
  return sha256Hex(HANDLE_LOOKUP_DOMAIN + handle);
}

/**
 * Compares two strings without early-exit, including their length difference
 * in the accumulator. Used for user-code comparisons so timing does not leak
 * a matching prefix.
 */
// consumed by the CLI approval mutation in Pass 2.
// fallow-ignore-next-line unused-export
export function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Extracts a CLI bearer token from an `Authorization` header.
 *
 * Accepts exactly `Bearer gcl_<43 base64url chars>` and returns the token;
 * every other shape (wrong scheme, wrong case, extra whitespace, wrong token
 * length, missing prefix) yields `null`.
 */
// consumed by the Bearer HTTP routes in Pass 3.
// fallow-ignore-next-line unused-export
export function bearerFromHeader(header: string | null): string | null {
  if (header === null) return null;
  const match = /^Bearer (gcl_[A-Za-z0-9_-]{43})$/.exec(header);
  return match ? match[1] : null;
}
