import { GoalDetailsContent } from './GoalDetailsContent';

import {
  InlineRichTextEditorChrome,
  InlineRichTextEmptyTrigger,
  useInlineRichTextEdit,
} from '@/components/ui/inline-rich-text-field';
import { isHTMLEmpty } from '@/components/ui/rich-text-editor';
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

  const edit = useInlineRichTextEdit({
    value: details,
    onCommit: (html) => onDetailsChange?.(html),
    enabled: editable,
  });

  if (!hasDetails && !editable) return null;

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1">
        {edit.isEditing ? (
          <InlineRichTextEditorChrome
            draft={edit.draft}
            onDraftChange={edit.setDraft}
            onSave={edit.save}
            onCancel={edit.cancel}
          />
        ) : hasDetails ? (
          <GoalDetailsContent
            title={title}
            details={details}
            onDetailsChange={onDetailsChange}
            readOnly={readOnly}
            onEditClick={editable ? edit.startEdit : undefined}
          />
        ) : (
          <InlineRichTextEmptyTrigger onClick={edit.startEdit} />
        )}
      </div>
    </>
  );
}

export { GoalDetailsSection };
