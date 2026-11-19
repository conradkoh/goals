import { describe, expect, it } from 'vitest';

import { buildLoginHref, sanitizeReturnTo } from './returnTo';

describe('sanitizeReturnTo', () => {
  it('returns same-origin relative paths unchanged', () => {
    expect(sanitizeReturnTo('/cli/authorize?request=a%26b')).toBe('/cli/authorize?request=a%26b');
    expect(sanitizeReturnTo('/app')).toBe('/app');
    expect(sanitizeReturnTo('/app/profile#cli-access')).toBe('/app/profile#cli-access');
  });

  it('rejects unsafe values', () => {
    expect(sanitizeReturnTo('https://evil.example')).toBeNull();
    expect(sanitizeReturnTo('//evil.example')).toBeNull();
    expect(sanitizeReturnTo('/\\evil.example')).toBeNull();
    expect(sanitizeReturnTo('/\t/evil.example')).toBeNull();
    expect(sanitizeReturnTo('/\n/evil.example')).toBeNull();
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnTo('')).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo('app')).toBeNull();
  });
});

describe('buildLoginHref', () => {
  it('encodes a same-origin returnTo path', () => {
    expect(buildLoginHref('/cli/authorize?request=ID')).toBe(
      '/login?returnTo=%2Fcli%2Fauthorize%3Frequest%3DID'
    );
  });

  it('falls back to plain /login for unsafe values', () => {
    expect(buildLoginHref('//evil.example')).toBe('/login');
  });
});
