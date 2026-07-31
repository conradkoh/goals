import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  InlineRichTextEditorChrome,
  InlineRichTextEmptyTrigger,
  useInlineRichTextEdit,
} from './inline-rich-text-field';

vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => {
    const textContent = html.replace(/<[^>]*>/g, '');
    const cleanContent = textContent.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    return cleanContent === '';
  },
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      aria-label="Goal details editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('useInlineRichTextEdit', () => {
  it('startEdit sets isEditing true and draft equals value', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useInlineRichTextEdit({ value: '<p>initial</p>', onCommit })
    );
    expect(result.current.isEditing).toBe(false);
    act(() => result.current.startEdit());
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe('<p>initial</p>');
  });

  it('save calls onCommit when draft changed', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useInlineRichTextEdit({ value: '<p>initial</p>', onCommit })
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft('<p>updated</p>'));
    act(() => result.current.save());
    expect(onCommit).toHaveBeenCalledWith('<p>updated</p>');
    expect(result.current.isEditing).toBe(false);
  });

  it('save does not call onCommit when draft unchanged', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useInlineRichTextEdit({ value: '<p>same</p>', onCommit }));
    act(() => result.current.startEdit());
    act(() => result.current.save());
    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it('save after cancel does not call onCommit', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useInlineRichTextEdit({ value: '', onCommit }));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft('<p>x</p>'));
    act(() => result.current.cancel());
    act(() => result.current.save());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('enabled false does not call onCommit even when draft changed', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useInlineRichTextEdit({ value: '<p>initial</p>', onCommit, enabled: false })
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft('<p>updated</p>'));
    act(() => result.current.save());
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('InlineRichTextEmptyTrigger', () => {
  it('renders label and calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<InlineRichTextEmptyTrigger onClick={onClick} />);
    const button = screen.getByRole('button', { name: /no details — click to add/i });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('InlineRichTextEditorChrome', () => {
  it('calls onCancel on Escape', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineRichTextEditorChrome
        draft=""
        onDraftChange={() => {}}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const editor = screen.getByRole('textbox', { name: /goal details editor/i });
    const container = editor.closest('[class*="rounded-md"]');
    expect(container).not.toBeNull();
    fireEvent.keyDown(container as Element, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave on Cmd+Enter', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineRichTextEditorChrome
        draft=""
        onDraftChange={() => {}}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const editor = screen.getByRole('textbox', { name: /goal details editor/i });
    const container = editor.closest('[class*="rounded-md"]');
    expect(container).not.toBeNull();
    fireEvent.keyDown(container as Element, { key: 'Enter', metaKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onSave on blur of container', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineRichTextEditorChrome
        draft=""
        onDraftChange={() => {}}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const editor = screen.getByRole('textbox', { name: /goal details editor/i });
    const container = editor.closest('[class*="rounded-md"]');
    expect(container).not.toBeNull();
    fireEvent.blur(container as Element);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
