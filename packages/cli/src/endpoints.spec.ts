import { describe, expect, it } from 'vitest';

import { DEFAULT_ENDPOINTS, parseOrigin, resolveEndpoints } from './endpoints.js';
import { UsageError } from './errors.js';

describe('parseOrigin', () => {
  it.each([
    ['https://goals.example.com', 'https://goals.example.com'],
    ['https://goals.example.com/', 'https://goals.example.com'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['http://127.0.0.1:3211', 'http://127.0.0.1:3211'],
  ])('accepts %s', (input, expected) => {
    expect(parseOrigin(input)).toBe(expected);
  });

  it.each([
    'http://goals.example.com',
    'ftp://x',
    'https://goals.example.com/app',
    'https://u:p@goals.example.com',
    'https://goals.example.com?x=1',
    'https://goals.example.com#a',
    'not a url',
    '',
  ])('rejects %s', (input) => {
    expect(parseOrigin(input)).toBeUndefined();
  });
});

describe('resolveEndpoints', () => {
  it('rejects exactly one flag', () => {
    expect(() => resolveEndpoints({ webappUrl: 'https://goals.example.com' })).toThrow(UsageError);
    expect(() => resolveEndpoints({ convexUrl: 'https://example-123.convex.site' })).toThrow(
      UsageError
    );
    expect(() => resolveEndpoints({ webappUrl: 'https://goals.example.com' })).toThrow(
      '--webapp-url and --convex-url must be passed together'
    );
  });

  it('normalizes a valid pair', () => {
    expect(
      resolveEndpoints({
        webappUrl: 'https://goals.example.com/',
        convexUrl: 'https://example-123.convex.site/',
      })
    ).toEqual({
      webappUrl: 'https://goals.example.com',
      convexUrl: 'https://example-123.convex.site',
    });
  });

  it('uses the production defaults when neither flag is given', () => {
    expect(resolveEndpoints({})).toEqual({
      webappUrl: 'https://goals-ten.vercel.app',
      convexUrl: 'https://happy-otter-123.convex.site',
    });
  });

  it('ships valid default origins', () => {
    expect(parseOrigin(DEFAULT_ENDPOINTS.webappUrl)).toBe(DEFAULT_ENDPOINTS.webappUrl);
    expect(parseOrigin(DEFAULT_ENDPOINTS.convexUrl)).toBe(DEFAULT_ENDPOINTS.convexUrl);
  });

  it('names the offending flag', () => {
    expect(() =>
      resolveEndpoints({
        webappUrl: 'http://goals.example.com',
        convexUrl: 'https://example-123.convex.site',
      })
    ).toThrow(/--webapp-url must be an https origin/);
    expect(() =>
      resolveEndpoints({
        webappUrl: 'https://goals.example.com',
        convexUrl: 'http://example-123.convex.site',
      })
    ).toThrow(/--convex-url must be an https origin/);
  });
});
