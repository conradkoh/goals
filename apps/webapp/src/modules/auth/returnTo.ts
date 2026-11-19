const BASE = 'http://localhost';

/**
 * Returns `value` unchanged when it is a same-origin relative URL (path + optional search/hash),
 * otherwise null. Rejects: null/undefined/empty, anything not starting with a single '/',
 * protocol-relative ('//x'), backslashes, ASCII control characters (incl. tab/CR/LF), and
 * anything whose resolved origin is not the base origin (absolute URLs, 'javascript:' ...).
 *
 * The raw-string checks come first on purpose: WHATWG URL parsing silently strips tabs/CR/LF
 * and treats '\' as '/', so `"/\t/evil.com"` and `"/\\evil.com"` would otherwise resolve to
 * the origin `http://evil.com`.
 */
// fallow-ignore-next-line complexity
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    return new URL(value, BASE).origin === BASE ? value : null;
  } catch {
    return null;
  }
}

/**
 * `/login?returnTo=<encoded>`. Caller passes a same-origin path+search (it is sanitized; unsafe → plain `/login`).
 * Public helper for sign-in flows that need to send the user back to a protected route.
 */
export function buildLoginHref(returnTo: string): string {
  const safe = sanitizeReturnTo(returnTo);
  return safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login';
}
