import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupPwaKeyboardFocusIfNeeded } from './setupPwaKeyboardFocus';

describe('setupPwaKeyboardFocusIfNeeded', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { ...navigator, standalone: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.removeAttribute('tabindex');
  });

  function setup() {
    const cleanup = setupPwaKeyboardFocusIfNeeded();
    if (!cleanup) {
      throw new Error('Expected PWA keyboard focus setup in standalone mode');
    }
    return cleanup;
  }

  it('returns undefined outside standalone PWA mode', () => {
    vi.stubGlobal('navigator', { ...navigator, standalone: false });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });

    expect(setupPwaKeyboardFocusIfNeeded()).toBeUndefined();
  });

  it('makes body focusable and focuses it on setup', () => {
    const cleanup = setup();

    expect(document.body.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(document.body);

    cleanup();
  });

  it('refocuses body after pointerup on non-typing targets', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const cleanup = setup();
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(document.activeElement).toBe(document.body);

    document.body.removeChild(button);
    cleanup();
  });

  it('does not refocus body after pointerup on text inputs', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const cleanup = setup();
    input.focus();
    input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(document.activeElement).toBe(input);

    document.body.removeChild(input);
    cleanup();
  });

  it('restores previous tabindex on cleanup', () => {
    document.body.setAttribute('tabindex', '0');

    const cleanup = setup();
    cleanup();

    expect(document.body.getAttribute('tabindex')).toBe('0');
  });
});
