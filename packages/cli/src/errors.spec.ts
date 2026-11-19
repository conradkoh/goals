import { describe, expect, it } from 'vitest';

import { CliError, safeMessage, UsageError } from './errors.js';

describe('CliError', () => {
  it('keeps its message and name', () => {
    const error = new CliError('boom');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CliError');
    expect(error.message).toBe('boom');
  });
});

describe('UsageError', () => {
  it('prefixes the message with "Usage: " exactly once', () => {
    expect(new UsageError('x').message).toBe('Usage: x');
    expect(new UsageError('Usage: x').message).toBe('Usage: x');
  });

  it('is a distinct error type', () => {
    expect(new UsageError('x').name).toBe('UsageError');
    expect(new UsageError('x')).not.toBeInstanceOf(CliError);
  });
});

describe('safeMessage', () => {
  it('returns the first non-empty line', () => {
    expect(safeMessage('first\nsecond', 'fallback')).toBe('first');
    expect(safeMessage('  padded  ', 'fallback')).toBe('padded');
  });

  it.each(['token', 'Bearer', 'a secret', 'device code', 'handle', 'checksum', 'TOKEN'])(
    'returns the fallback for secret-ish text: %s',
    (message) => {
      expect(safeMessage(message, 'fallback')).toBe('fallback');
    }
  );

  it('returns the fallback for empty, whitespace and non-string input', () => {
    expect(safeMessage('', 'fallback')).toBe('fallback');
    expect(safeMessage('   \n next', 'fallback')).toBe('fallback');
    expect(safeMessage(undefined, 'fallback')).toBe('fallback');
    expect(safeMessage(42, 'fallback')).toBe('fallback');
    expect(safeMessage({ message: 'nope' }, 'fallback')).toBe('fallback');
  });
});
