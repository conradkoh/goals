/**
 * Shared constants for the `goals` CLI credential flow.
 *
 * Additional TTL/limit constants are introduced in the pass that consumes
 * them, so this module never exports a value without a live consumer.
 */

/** Prefix of the derived session handle; requireLogin treats it as a CLI handle and never consults `sessions`. */
export const CLI_HANDLE_PREFIX = 'cli_';
