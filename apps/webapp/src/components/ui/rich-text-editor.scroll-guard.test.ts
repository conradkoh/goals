import { describe, expect, it, vi } from 'vitest';

import { shouldScrollCaretOnFocus } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

describe('shouldScrollCaretOnFocus', () => {
  it('scrolls when focus came from a pointer interaction', () => {
    expect(
      shouldScrollCaretOnFocus({ focusFromPointer: true, skipScrollFromVisibilityRestore: false })
    ).toBe(true);
  });

  it('does not scroll when focus was not from a pointer interaction', () => {
    expect(
      shouldScrollCaretOnFocus({ focusFromPointer: false, skipScrollFromVisibilityRestore: false })
    ).toBe(false);
  });

  it('does not scroll when focus follows a visibility restore (alt-tab / tab switch)', () => {
    expect(
      shouldScrollCaretOnFocus({ focusFromPointer: true, skipScrollFromVisibilityRestore: true })
    ).toBe(false);
  });

  it('does not scroll when both conditions are set', () => {
    expect(
      shouldScrollCaretOnFocus({ focusFromPointer: false, skipScrollFromVisibilityRestore: true })
    ).toBe(false);
  });
});
