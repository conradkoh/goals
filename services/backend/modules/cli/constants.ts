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
