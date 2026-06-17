import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewModeKeyboardShortcuts } from './ViewModeKeyboardShortcuts';

describe('ViewModeKeyboardShortcuts', () => {
  const onViewModeChange = vi.fn();
  const onOpenQuarterJump = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.tabIndex = -1;
    document.body.focus();
  });

  afterEach(() => {
    document.body.tabIndex = 0;
  });

  function pressKey(key: string, init: KeyboardEventInit = {}) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  }

  it('switches view when body is focused', () => {
    render(
      <ViewModeKeyboardShortcuts
        onViewModeChange={onViewModeChange}
        onOpenQuarterJump={onOpenQuarterJump}
      />
    );

    pressKey('q');
    expect(onViewModeChange).toHaveBeenCalledWith('quarterly');

    pressKey('f');
    expect(onViewModeChange).toHaveBeenCalledWith('focused');
  });

  it('switches view when a button is focused', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    render(
      <ViewModeKeyboardShortcuts
        onViewModeChange={onViewModeChange}
        onOpenQuarterJump={onOpenQuarterJump}
      />
    );

    pressKey('q');
    expect(onViewModeChange).toHaveBeenCalledWith('quarterly');

    document.body.removeChild(button);
  });

  it('does not switch view when a text input is focused', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();

    render(
      <ViewModeKeyboardShortcuts
        onViewModeChange={onViewModeChange}
        onOpenQuarterJump={onOpenQuarterJump}
      />
    );

    pressKey('q');
    expect(onViewModeChange).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('opens quarter jump on Cmd+K even when input focused', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();

    render(
      <ViewModeKeyboardShortcuts
        onViewModeChange={onViewModeChange}
        onOpenQuarterJump={onOpenQuarterJump}
      />
    );

    pressKey('k', { metaKey: true });
    expect(onOpenQuarterJump).toHaveBeenCalledTimes(1);
    expect(onViewModeChange).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
