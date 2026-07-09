import { describe, expect, it } from 'vitest';

import { isInteractiveClickTarget } from './isInteractiveClickTarget';

describe('isInteractiveClickTarget', () => {
  it('returns true for anchor elements', () => {
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com';
    document.body.appendChild(anchor);

    expect(isInteractiveClickTarget(anchor)).toBe(true);

    document.body.removeChild(anchor);
  });

  it('returns true for input elements', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    document.body.appendChild(input);

    expect(isInteractiveClickTarget(input)).toBe(true);

    document.body.removeChild(input);
  });

  it('returns true for task list items', () => {
    const taskItem = document.createElement('li');
    taskItem.setAttribute('data-type', 'taskItem');
    document.body.appendChild(taskItem);

    expect(isInteractiveClickTarget(taskItem)).toBe(true);

    document.body.removeChild(taskItem);
  });

  it('returns false for plain paragraph elements', () => {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Some details text';
    document.body.appendChild(paragraph);

    expect(isInteractiveClickTarget(paragraph)).toBe(false);

    document.body.removeChild(paragraph);
  });

  it('returns false for null target', () => {
    expect(isInteractiveClickTarget(null)).toBe(false);
  });
});
