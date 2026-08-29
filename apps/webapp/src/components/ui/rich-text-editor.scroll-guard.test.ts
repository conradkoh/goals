import { describe, expect, it, vi } from 'vitest';

import { isTaskCheckboxInteraction, shouldScrollCaretOnFocus } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

describe('shouldScrollCaretOnFocus', () => {
  it('scrolls when focus came from a pointer interaction', () => {
    expect(
      shouldScrollCaretOnFocus({
        focusFromPointer: true,
        skipScrollFromVisibilityRestore: false,
        isTaskCheckboxInteraction: false,
      })
    ).toBe(true);
  });

  it('does not scroll when focus was not from a pointer interaction', () => {
    expect(
      shouldScrollCaretOnFocus({
        focusFromPointer: false,
        skipScrollFromVisibilityRestore: false,
        isTaskCheckboxInteraction: false,
      })
    ).toBe(false);
  });

  it('does not scroll when focus follows a visibility restore (alt-tab / tab switch)', () => {
    expect(
      shouldScrollCaretOnFocus({
        focusFromPointer: true,
        skipScrollFromVisibilityRestore: true,
        isTaskCheckboxInteraction: false,
      })
    ).toBe(false);
  });

  it('does not scroll when both conditions are set', () => {
    expect(
      shouldScrollCaretOnFocus({
        focusFromPointer: false,
        skipScrollFromVisibilityRestore: true,
        isTaskCheckboxInteraction: false,
      })
    ).toBe(false);
  });
});

describe('isTaskCheckboxInteraction', () => {
  it('returns true for checkbox inside task item label', () => {
    document.body.innerHTML =
      '<li data-type="taskItem"><label><input type="checkbox" /></label><div><p>Task</p></div></li>';
    expect(isTaskCheckboxInteraction(document.querySelector('input[type="checkbox"]'))).toBe(true);
  });

  it('returns false for paragraph text in editor', () => {
    document.body.innerHTML = '<p>Hello</p>';
    expect(isTaskCheckboxInteraction(document.querySelector('p'))).toBe(false);
  });
});

describe('shouldScrollCaretOnFocus — task checkbox', () => {
  it('does not scroll when interaction was a task checkbox', () => {
    expect(
      shouldScrollCaretOnFocus({
        focusFromPointer: true,
        skipScrollFromVisibilityRestore: false,
        isTaskCheckboxInteraction: true,
      })
    ).toBe(false);
  });
});
