import { UsageError } from './errors.js';

export interface Endpoints {
  /** Webapp origin used to build the browser approval URL, e.g. https://goals.example.com */
  webappUrl: string;
  /** Convex HTTP-actions origin (the `.convex.site` URL), e.g. https://example-123.convex.site */
  convexUrl: string;
}

/**
 * ===== PRODUCTION ENDPOINTS — NOT YET DECIDED =====
 * Fill BOTH values with https origins once the maintainer supplies them. While either is
 * empty, `goals auth login` fails with a usage error asking for --webapp-url/--convex-url.
 * Never read these from an environment variable or guess them.
 */
// Asserted by cli.spec.ts, which skips the empty-default cases once this is filled.
// fallow-ignore-next-line unused-export
export const DEFAULT_ENDPOINTS: Endpoints = { webappUrl: '', convexUrl: '' };

const WEBAPP_EXAMPLE = 'https://goals.example.com';
const CONVEX_EXAMPLE = 'https://example-123.convex.site';

/** Parses `value` as a URL, or `undefined` when it is not one. */
function toUrl(value: string): URL | undefined {
  try {
    return new URL(value.trim());
  } catch {
    return undefined;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** https anywhere, or plain http only for a local development server. */
function hasAllowedProtocol(url: URL): boolean {
  return url.protocol === 'https:' || (url.protocol === 'http:' && isLocalHost(url.hostname));
}

function hasNoCredentials(url: URL): boolean {
  return url.username === '' && url.password === '';
}

function hasNoQueryOrFragment(url: URL): boolean {
  return url.search === '' && url.hash === '';
}

function isPlainOrigin(url: URL): boolean {
  return (
    hasAllowedProtocol(url) &&
    hasNoCredentials(url) &&
    hasNoQueryOrFragment(url) &&
    url.pathname === '/'
  );
}

/**
 * Normalized origin (no trailing slash) when `value` is an https origin (http only for
 * localhost / 127.0.0.1) with no path, query, fragment or credentials; otherwise `undefined`.
 */
export function parseOrigin(value: string): string | undefined {
  const url = toUrl(value);
  if (url === undefined) return undefined;
  return isPlainOrigin(url) ? url.origin : undefined;
}

function requireOrigin(value: string, flag: string, example: string): string {
  const origin = parseOrigin(value);
  if (origin === undefined) {
    throw new UsageError(
      `${flag} must be an https origin such as ${example} (http is allowed only for localhost or 127.0.0.1)`
    );
  }
  return origin;
}

/** Validates both URLs; throws UsageError naming the offending flag. */
function validateEndpointPair(webappUrl: string, convexUrl: string): Endpoints {
  return {
    webappUrl: requireOrigin(webappUrl, '--webapp-url', WEBAPP_EXAMPLE),
    convexUrl: requireOrigin(convexUrl, '--convex-url', CONVEX_EXAMPLE),
  };
}

function configuredDefaults(): Endpoints {
  if (DEFAULT_ENDPOINTS.webappUrl === '' || DEFAULT_ENDPOINTS.convexUrl === '') {
    throw new UsageError(
      'no default Goals endpoints are configured; pass --webapp-url and --convex-url together'
    );
  }
  return validateEndpointPair(DEFAULT_ENDPOINTS.webappUrl, DEFAULT_ENDPOINTS.convexUrl);
}

function bothMissing(webappUrl: string | undefined, convexUrl: string | undefined): boolean {
  return webappUrl === undefined && convexUrl === undefined;
}

/**
 * Endpoints for a login: both flags together, or neither (then DEFAULT_ENDPOINTS).
 * Exactly one flag → UsageError('--webapp-url and --convex-url must be passed together').
 * Neither flag and an empty default → UsageError('no default Goals endpoints are configured; pass --webapp-url and --convex-url together').
 */
export function resolveEndpoints(flags: { webappUrl?: string; convexUrl?: string }): Endpoints {
  const { webappUrl, convexUrl } = flags;
  if (bothMissing(webappUrl, convexUrl)) return configuredDefaults();
  if (webappUrl === undefined || convexUrl === undefined) {
    throw new UsageError('--webapp-url and --convex-url must be passed together');
  }
  return validateEndpointPair(webappUrl, convexUrl);
}
