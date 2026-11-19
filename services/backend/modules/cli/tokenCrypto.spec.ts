/**
 * Tests for the CLI token primitives.
 *
 * The SHA-256 vectors are literals produced independently with Node's
 * `crypto.createHash`, so a wrong domain prefix or encoding fails here rather
 * than being masked by re-running the implementation under test.
 */

import { describe, expect, test } from 'vitest';

import {
  bearerFromHeader,
  constantTimeEqual,
  deriveSessionHandle,
  generateDeviceCode,
  generateRequestId,
  generateToken,
  generateUserCode,
  hashDeviceCode,
  hashHandle,
} from './tokenCrypto';

describe('sha256 domain-separated vectors', () => {
  test('device code hash of "abc"', async () => {
    expect(await hashDeviceCode('abc')).toBe(
      'e6df0f4cbd76968f11fccabf3987e6c25f41d70986359025b9d08acc34f258f6'
    );
  });

  test('handle derivation of "gcl_test"', async () => {
    expect(await deriveSessionHandle('gcl_test')).toBe(
      'cli_b8f74b40ebbd770398f3d4cbf2f5e3620894b09356c26965572575617177f403'
    );
  });

  test('handle lookup hash of "cli_test"', async () => {
    expect(await hashHandle('cli_test')).toBe(
      'd60bb58e810c012b7eb7107f0097ef816bd8a84cd56402ff893f4fe26be583eb'
    );
  });
});

describe('generateToken', () => {
  test('matches the gcl_ bearer format', () => {
    expect(generateToken()).toMatch(/^gcl_[A-Za-z0-9_-]{43}$/);
  });

  test('50 draws are all distinct', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('generateDeviceCode', () => {
  test('is 64 lowercase hex characters', () => {
    expect(generateDeviceCode()).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateUserCode', () => {
  test('500 draws are six digits with no leading zero', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(generateUserCode()).toMatch(/^[1-9][0-9]{5}$/);
    }
  });
});

describe('generateRequestId', () => {
  test('is a UUID', () => {
    expect(generateRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe('deriveSessionHandle', () => {
  test('has the cli_ prefix and 64 hex characters', async () => {
    const handle = await deriveSessionHandle('gcl_abc');
    expect(handle.startsWith('cli_')).toBe(true);
    expect(handle).toMatch(/^cli_[0-9a-f]{64}$/);
  });

  test('is deterministic for the same token and differs across tokens', async () => {
    const first = await deriveSessionHandle('gcl_same');
    const second = await deriveSessionHandle('gcl_same');
    const other = await deriveSessionHandle('gcl_other');
    expect(first).toBe(second);
    expect(first).not.toBe(other);
  });
});

describe('constantTimeEqual', () => {
  test('returns true for equal strings', () => {
    expect(constantTimeEqual('100000', '100000')).toBe(true);
  });

  test('returns false for different strings of the same length', () => {
    expect(constantTimeEqual('100000', '100001')).toBe(false);
  });

  test('returns false for different lengths', () => {
    expect(constantTimeEqual('100000', '1000000')).toBe(false);
    expect(constantTimeEqual('1000000', '100000')).toBe(false);
  });

  test('handles empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('', 'a')).toBe(false);
  });
});

describe('bearerFromHeader', () => {
  const token = `gcl_${'a'.repeat(43)}`;

  test('null header returns null', () => {
    expect(bearerFromHeader(null)).toBeNull();
  });

  test('valid bearer token is returned', () => {
    expect(bearerFromHeader(`Bearer ${token}`)).toBe(token);
  });

  test('wrong scheme is rejected', () => {
    expect(bearerFromHeader(`Basic ${token}`)).toBeNull();
  });

  test('lowercase scheme is rejected', () => {
    expect(bearerFromHeader(`bearer ${token}`)).toBeNull();
  });

  test('extra whitespace is rejected', () => {
    expect(bearerFromHeader(`Bearer  ${token}`)).toBeNull();
    expect(bearerFromHeader(` Bearer ${token}`)).toBeNull();
    expect(bearerFromHeader(`Bearer ${token} `)).toBeNull();
  });

  test('tokens of 42 or 44 characters are rejected', () => {
    expect(bearerFromHeader(`Bearer gcl_${'a'.repeat(42)}`)).toBeNull();
    expect(bearerFromHeader(`Bearer gcl_${'a'.repeat(44)}`)).toBeNull();
  });

  test('token without the gcl_ prefix is rejected', () => {
    expect(bearerFromHeader(`Bearer ${'a'.repeat(47)}`)).toBeNull();
  });
});
