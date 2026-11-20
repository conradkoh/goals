/**
 * Shared constants for the `goals` CLI credential flow.
 *
 * Additional TTL/limit constants are introduced in the pass that consumes
 * them, so this module never exports a value without a live consumer.
 */

/** Prefix of the derived session handle; requireLogin treats it as a CLI handle and never consults `sessions`. */
export const CLI_HANDLE_PREFIX = 'cli_';

/** Device-code login request lifetime. */
export const CLI_REQUEST_TTL_MS = 10 * 60_000;
/** Expired/resolved request rows are deleted only after this grace period, so a late poll still reports `expired`/`consumed` instead of `not_found`. */
export const CLI_REQUEST_RETENTION_MS = 60 * 60_000;
/** Absolute credential lifetime (180 days). */
export const CLI_CREDENTIAL_TTL_MS = 180 * 24 * 3_600_000;
/** Revoked/expired credential rows are deleted after this long. */
export const CLI_CREDENTIAL_RETENTION_MS = 30 * 24 * 3_600_000;
/** `lastUsedAt` is written at most once per this interval. */
export const CLI_TOUCH_INTERVAL_MS = 10 * 60_000;
export const CLI_MAX_PENDING_GLOBAL = 200;
export const CLI_MAX_PENDING_PER_INSTALLATION = 5;
export const CLI_MAX_CODE_ATTEMPTS = 5;
export const CLI_MAX_ACTIVE_CREDENTIALS_PER_USER = 25;

/** Minimum CLI poll interval returned to clients (ms). */
export const CLI_POLL_INTERVAL_MS = 2_000;
/** Max body size for the unauthenticated POST routes (bytes). */
export const CLI_UNAUTH_BODY_LIMIT = 8_192;
/** Retry-After (seconds) sent with 429 responses on login request creation. */
export const CLI_RATE_LIMIT_RETRY_AFTER_S = 60;

/** Max body size for POST /cli/v1/call (bytes). */
export const CLI_CALL_BODY_LIMIT = 65_536;
/** Default `limit` for list ops. */
export const CLI_LIST_DEFAULT_LIMIT = 200;
/** Maximum accepted `limit` for list ops. */
export const CLI_LIST_MAX_LIMIT = 500;
