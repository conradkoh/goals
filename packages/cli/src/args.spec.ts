import { describe, expect, it } from 'vitest';

import { booleanFlag, parseFlags, stringFlag } from './args.js';
import { UsageError } from './errors.js';

const HINT = 'goals demo --help';
const SPEC = { quarter: { type: 'string' }, all: { type: 'boolean' } } as const;

function capture(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected a thrown error');
}

describe('parseFlags', () => {
  it('turns an unknown option into a UsageError naming the option and the hint', () => {
    const error = capture(() => parseFlags(['--quarter', '3'], { week: { type: 'string' } }, HINT));

    expect(error).toBeInstanceOf(UsageError);
    expect(error.message.startsWith('Usage: ')).toBe(true);
    expect(error.message).toContain('--quarter');
    expect(error.message).toContain(`Run \`${HINT}\` for usage.`);
  });

  it('turns a string option without a value into a UsageError', () => {
    const error = capture(() => parseFlags(['--quarter'], SPEC, HINT));

    expect(error).toBeInstanceOf(UsageError);
    expect(error.message.startsWith('Usage: ')).toBe(true);
    expect(error.message).toContain('--quarter');
    expect(error.message).toContain(`Run \`${HINT}\` for usage.`);
  });

  it('reports a missing required positional', () => {
    const error = capture(() => parseFlags([], SPEC, HINT, { min: 1, max: 1, name: '<label>' }));

    expect(error).toBeInstanceOf(UsageError);
    expect(error.message).toBe(
      `Usage: missing required argument <label>. Run \`${HINT}\` for usage.`
    );
  });

  it('reports an unexpected positional', () => {
    const error = capture(() =>
      parseFlags(['dev', 'extra'], SPEC, HINT, { min: 1, max: 1, name: '<label>' })
    );

    expect(error).toBeInstanceOf(UsageError);
    expect(error.message).toBe(`Usage: unexpected argument 'extra'. Run \`${HINT}\` for usage.`);
  });

  it('reports an unexpected positional when no positionals are allowed', () => {
    const error = capture(() => parseFlags(['stray'], SPEC, HINT));

    expect(error).toBeInstanceOf(UsageError);
    expect(error.message).toBe(`Usage: unexpected argument 'stray'. Run \`${HINT}\` for usage.`);
  });

  it('collects flags and positionals', () => {
    const parsed = parseFlags(['dev', '--quarter', '3', '--all'], SPEC, HINT, {
      min: 0,
      max: 1,
      name: '<label>',
    });

    expect(parsed.positionals).toEqual(['dev']);
    expect(stringFlag(parsed, 'quarter')).toBe('3');
    expect(booleanFlag(parsed, 'all')).toBe(true);
  });

  it('returns undefined for an absent string flag and false for an absent boolean flag', () => {
    const parsed = parseFlags([], SPEC, HINT);

    expect(stringFlag(parsed, 'quarter')).toBeUndefined();
    expect(booleanFlag(parsed, 'all')).toBe(false);
  });

  it('keeps an explicitly empty string flag as an empty string', () => {
    const parsed = parseFlags(['--quarter', ''], SPEC, HINT);

    expect(stringFlag(parsed, 'quarter')).toBe('');
  });
});
