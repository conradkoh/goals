import { describe, expect, it } from 'vitest';

import { formatVerificationCode } from './formatVerificationCode';

describe('formatVerificationCode', () => {
  it('groups six digits as 3 + 3', () => {
    expect(formatVerificationCode('123456')).toBe('123 456');
  });

  it('leaves partial input ungrouped until the fourth digit', () => {
    expect(formatVerificationCode('')).toBe('');
    expect(formatVerificationCode('1')).toBe('1');
    expect(formatVerificationCode('123')).toBe('123');
    expect(formatVerificationCode('1234')).toBe('123 4');
    expect(formatVerificationCode('12345')).toBe('123 45');
  });
});
