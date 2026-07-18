import { useCallback, useEffect, useRef, useState } from 'react';

import { GoalDetailsContent } from './GoalDetailsContent';

import { isHTMLEmpty, RichTextEditor } from '@/components/ui/rich-text-editor';
import { Separator } from '@/components/ui/separator';

export interface GoalDetailsSectionProps {
  /** Goal title (for full view dialog) */
  title: string;
  /** HTML details content */
  details: string;
  /** Whether to show the separator above this section */
  showSeparator?: boolean;
  /** Callback when task list items are checked/unchecked; sets editable mode */
  onDetailsChange?: (newDetails: string) => void;
  /** If true, task list checkboxes are disabled */
  readOnly?: boolean;
}

function GoalDetailsSection({
  title,
  details,
  showSeparator = true,
  onDetailsChange,
  readOnly = false,
}: GoalDetailsSectionProps) {
  const editable = Boolean(onDetailsChange) && !readOnly;
  const hasDetails = !isHTMLEmpty(details);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(details);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(details);
  }, [details, isEditing]);

  const startEdit = useCallback(() => {
    setDraft(details);
    setIsEditing(true);
  }, [details]);

  const saveAndClose = useCallback(() => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    if (editable && onDetailsChange && draft !== details) onDetailsChange(draft);
    setIsEditing(false);
  }, [editable, onDetailsChange, draft, details]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true;
    setDraft(details);
    setIsEditing(false);
  }, [details]);

  if (!hasDetails && !editable) return null;

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1">
        {isEditing ? (
          <div
            className="min-w-0 rounded-md pt-4 pb-4 px-3 bg-muted/30"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                saveAndClose();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancel();
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveAndClose();
              }
            }}
          >
            <RichTextEditor
              value={draft}
              onChange={setDraft}
              autoFocus
              placeholder="Add goal details..."
              className="text-sm"
            />
          </div>
        ) : hasDetails ? (
          <GoalDetailsContent
            title={title}
            details={details}
            onDetailsChange={onDetailsChange}
            readOnly={readOnly}
            onEditClick={editable ? startEdit : undefined}
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md px-3 py-4 transition-colors cursor-pointer"
          >
            No details — click to add
          </button>
        )}
      </div>
    </>
  );
}

export { GoalDetailsSection };
