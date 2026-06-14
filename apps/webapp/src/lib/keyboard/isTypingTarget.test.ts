import { describe, expect, it } from 'vitest';

import { isTypingTarget } from './isTypingTarget';

describe('isTypingTarget', () => {
  it('returns false for null/undefined/body', () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
  });

  it('returns false for buttons and links', () => {
    const button = document.createElement('button');
    const link = document.createElement('a');
    expect(isTypingTarget(button)).toBe(false);
    expect(isTypingTarget(link)).toBe(false);
  });

  it('returns true for text inputs and textareas', () => {
    const input = document.createElement('input');
    input.type = 'text';
    const textarea = document.createElement('textarea');
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(textarea)).toBe(true);
  });

  it('returns true for contenteditable and combobox role', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    const combobox = document.createElement('div');
    combobox.setAttribute('role', 'combobox');
    expect(isTypingTarget(div)).toBe(true);
    expect(isTypingTarget(combobox)).toBe(true);
  });
});
