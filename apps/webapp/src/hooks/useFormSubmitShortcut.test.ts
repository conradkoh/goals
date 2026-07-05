import { renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFormSubmitShortcut } from './useFormSubmitShortcut';

function createKeyboardEvent(key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean }) {
  return {
    key,
    metaKey: modifiers.metaKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('useFormSubmitShortcut', () => {
  it('calls onSubmit for Cmd+Enter', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFormSubmitShortcut({ onSubmit }));

    result.current(createKeyboardEvent('Enter', { metaKey: true }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onSubmit for Ctrl+Enter', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFormSubmitShortcut({ onSubmit }));

    result.current(createKeyboardEvent('Enter', { ctrlKey: true }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('does not call onSubmit for Enter without modifier', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFormSubmitShortcut({ onSubmit }));

    result.current(createKeyboardEvent('Enter', {}));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when disabled', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFormSubmitShortcut({ onSubmit, disabled: true }));

    result.current(createKeyboardEvent('Enter', { metaKey: true }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prevents default when shouldPreventDefault is true', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFormSubmitShortcut({ onSubmit }));
    const event = createKeyboardEvent('Enter', { metaKey: true });

    result.current(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
