import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

export interface UseInlineRichTextEditOptions {
  /** Committed HTML value from parent */
  value: string;
  /** Called with new HTML when user saves (blur or Cmd/Ctrl+Enter) */
  onCommit: (html: string) => void;
  /** When false, save does not call onCommit */
  enabled?: boolean;
}

export interface UseInlineRichTextEditResult {
  isEditing: boolean;
  draft: string;
  setDraft: (html: string) => void;
  startEdit: () => void;
  cancel: () => void;
  save: () => void;
}

/**
 * Inline rich-text edit lifecycle: draft sync, cancel-ref blur guard, commit on save.
 * Invariants: cancel() sets isCancellingRef so subsequent save() does not call onCommit;
 * onCommit only when enabled && draft !== value.
 */
export function useInlineRichTextEdit({
  value,
  onCommit,
  enabled = true,
}: UseInlineRichTextEditOptions): UseInlineRichTextEditResult {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const startEdit = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true;
    setDraft(value);
    setIsEditing(false);
  }, [value]);

  const save = useCallback(() => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    if (enabled && draft !== value) onCommit(draft);
    setIsEditing(false);
  }, [enabled, draft, value, onCommit]);

  return { isEditing, draft, setDraft, startEdit, cancel, save };
}

export interface InlineRichTextEditorChromeProps {
  draft: string;
  onDraftChange: (html: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
}

/** Blur/keydown wrapper + RichTextEditor — mount when editing */
export function InlineRichTextEditorChrome({
  draft,
  onDraftChange,
  onSave,
  onCancel,
  placeholder = 'Add goal details...',
  className,
  editorClassName,
  autoFocus = true,
}: InlineRichTextEditorChromeProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div
      className={cn('min-w-0 rounded-md pt-4 pb-4 px-3 bg-muted', className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onSave();
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <RichTextEditor
        value={draft}
        onChange={onDraftChange}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn('text-sm', editorClassName)}
      />
    </div>
  );
}

export interface InlineRichTextEmptyTriggerProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/** Empty-state clickable trigger — default "No details — click to add" */
export function InlineRichTextEmptyTrigger({
  onClick,
  label = 'No details — click to add',
  className,
}: InlineRichTextEmptyTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-3 py-4 transition-colors cursor-pointer',
        className
      )}
    >
      {label}
    </button>
  );
}
