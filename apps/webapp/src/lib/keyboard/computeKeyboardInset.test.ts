import { describe, expect, it } from 'vitest';

import { computeKeyboardInset } from './computeKeyboardInset';

describe('computeKeyboardInset', () => {
  it('returns 0 when viewport is null/undefined', () => {
    expect(computeKeyboardInset(null, 800)).toBe(0);
    expect(computeKeyboardInset(undefined, 800)).toBe(0);
  });

  it('returns 0 when there is no overlap (keyboard closed)', () => {
    expect(computeKeyboardInset({ height: 800, offsetTop: 0 }, 800)).toBe(0);
  });

  it('returns the overlap when the keyboard is open', () => {
    // visible bottom = 500 + 0 = 500; overlap = 800 - 500 = 300
    expect(computeKeyboardInset({ height: 500, offsetTop: 0 }, 800)).toBe(300);
  });

  it('accounts for visual viewport offsetTop', () => {
    // visible bottom = 460 + 40 = 500; overlap = 800 - 500 = 300
    expect(computeKeyboardInset({ height: 460, offsetTop: 40 }, 800)).toBe(300);
  });

  it('ignores sub-pixel overlaps', () => {
    expect(computeKeyboardInset({ height: 799.6, offsetTop: 0 }, 800)).toBe(0);
  });

  it('returns 0 when layout height is not finite', () => {
    expect(computeKeyboardInset({ height: 500, offsetTop: 0 }, Number.NaN)).toBe(0);
  });
});
