/**
 * @file GoalLogCreateForm component for creating new log entries.
 * Features a date picker and rich text editor for content.
 * Supports keyboard shortcuts: Cmd/Ctrl+Enter to submit, Escape to cancel.
 */

import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { type Ref, useCallback, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  isHTMLEmpty,
  RichTextEditor,
  stripTrailingEmptyParagraphs,
} from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

/**
 * Combines a date and time string into a Date object.
 * @param date - The date portion
 * @param time - Time string in HH:mm format
 * @returns Combined Date object
 */
function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

/**
 * Extracts time string from a Date object in HH:mm format.
 * @param date - The date to extract time from
 * @returns Time string in HH:mm format
 */
function getTimeFromDate(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Builds the save arguments from the draft: the combined timestamp and the content
 * with trailing empty paragraphs removed.
 * @param logDate - The draft date
 * @param logTime - The draft time in HH:mm format
 * @param content - The editor HTML
 * @returns Arguments for the create or save callback
 */
function toSavePayload(logDate: Date, logTime: string, content: string) {
  const combinedDateTime = combineDateAndTime(logDate, logTime);
  return {
    logDate: combinedDateTime.getTime(),
    content: stripTrailingEmptyParagraphs(content),
  };
}

/**
 * Message from an unknown thrown value, falling back when it is not an Error.
 * @param err - The thrown value
 * @param fallback - Message used when the value has no message
 * @returns The message to show
 */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Whether the event is the Cmd/Ctrl+Enter submit shortcut.
 * @param e - The keyboard event
 * @returns True when the event is the submit shortcut
 */
function isSubmitShortcut(e: React.KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'Enter';
}

/**
 * Whether the event targets a control inside an open popover (the calendar).
 * @param e - The keyboard event
 * @returns True when the event belongs to a popover
 */
function isInsidePopover(e: React.KeyboardEvent): boolean {
  return (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') !== null;
}

/**
 * Whether the event should cancel the form: Escape outside an open popover.
 * @param e - The keyboard event
 * @returns True when the event is the cancel shortcut
 */
function isCancelShortcut(e: React.KeyboardEvent): boolean {
  return e.key === 'Escape' && !isInsidePopover(e);
}

/**
 * Whether the form can be submitted: it has content and no save is running.
 * @param content - The editor HTML
 * @param isSubmitting - Whether a save is running
 * @returns True when the form can be submitted
 */
function canSubmit(content: string, isSubmitting: boolean): boolean {
  return !isHTMLEmpty(content) && !isSubmitting;
}

/**
 * The submit/cancel keyboard shortcuts shared by the create and edit forms.
 * @param handleSubmit - Submits the form
 * @param handleCancel - Cancels the form
 * @param content - The editor HTML
 * @param isSubmitting - Whether a save is running
 * @returns The keydown-capture handler
 */
function useLogFormKeyDown(
  handleSubmit: () => void,
  handleCancel: () => void,
  content: string,
  isSubmitting: boolean
) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        if (canSubmit(content, isSubmitting)) handleSubmit();
        return;
      }

      if (isCancelShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    },
    [content, isSubmitting, handleSubmit, handleCancel]
  );
}

/**
 * A human label for the draft date. Today is called out explicitly.
 * @param date - The draft date
 * @returns The label shown on the date picker trigger
 */
function formatDateLabel(date: Date): string {
  const formatted = DateTime.fromJSDate(date).toFormat('LLL dd, yyyy');
  return DateTime.fromJSDate(date).hasSame(DateTime.now(), 'day')
    ? `Today (${formatted})`
    : formatted;
}

/** Props for LogFormFields. */
interface LogFormFieldsProps {
  /** The draft date. */
  logDate: Date;
  /** The draft time in HH:mm format. */
  logTime: string;
  /** The editor HTML. */
  content: string;
  /** Save error to show, if any. */
  error: string | null;
  /** Applies a new date to the draft. */
  onLogDateChange: (date: Date) => void;
  /** Applies a new time to the draft. */
  onLogTimeChange: (time: string) => void;
  /** Applies new editor HTML to the draft. */
  onContentChange: (content: string) => void;
}

/** Date, time and content fields shared by the create and edit forms. Presentational only. */
function LogFormFields({
  logDate,
  logTime,
  content,
  error,
  onLogDateChange,
  onLogTimeChange,
  onContentChange,
}: LogFormFieldsProps) {
  return (
    <>
      {/* Date and time picker */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
        <label className="text-sm font-medium text-muted-foreground">Log Date & Time</label>
        <div className="flex gap-2">
          <Popover modal>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'flex-1 justify-start text-left font-normal'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateLabel(logDate)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={logDate}
                onSelect={(date) => date && onLogDateChange(date)}
              />
            </PopoverContent>
          </Popover>
          <div className="relative flex items-center">
            <Clock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              value={logTime}
              onChange={(e) => onLogTimeChange(e.target.value)}
              className="w-[120px] pl-9"
            />
          </div>
        </div>
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with RichTextEditor below */}
        <label className="text-sm font-medium text-muted-foreground">Content</label>
        <RichTextEditor
          value={content}
          onChange={onContentChange}
          placeholder="What happened? What progress was made? Any blockers or issues?"
          autoFocus
        />
        {error && (
          <p className="text-sm text-destructive mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

/** Props for LogFormActions. */
interface LogFormActionsProps {
  /** Whether a save is running. */
  isSubmitting: boolean;
  /** The editor HTML, deciding whether submit is enabled. */
  content: string;
  /** Label of the submit button while idle. */
  submitLabel: string;
  /** Label of the submit button while saving. */
  submittingLabel: string;
  /** Cancels the form. */
  onCancel: () => void;
  /** Submits the form. */
  onSubmit: () => void;
}

/** Cancel and submit buttons shared by the create and edit forms. Presentational only. */
function LogFormActions({
  isSubmitting,
  content,
  submitLabel,
  submittingLabel,
  onCancel,
  onSubmit,
}: LogFormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={isHTMLEmpty(content) || isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}

/**
 * Props for the GoalLogCreateForm component.
 */
export interface GoalLogCreateFormProps {
  /** Callback when a new log entry is submitted */
  onSubmit: (logDate: number, content: string) => Promise<void>;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Whether the add form is open. The parent owns this state. */
  expanded: boolean;
  /** Requests an expanded state: true on trigger click; false on Cancel, Escape, or a successful submit. */
  onExpandedChange: (expanded: boolean) => void;
  /** Whether the form is disabled (e.g., when viewing full history) */
  disabled?: boolean;
  /** Label shown on the collapsed trigger while disabled. Defaults to 'Switch to current view to add entries'. */
  disabledLabel?: string;
  /** Ref forwarded to the collapsed 'Add log entry...' button, so a parent can return focus to it */
  triggerRef?: Ref<HTMLButtonElement>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Form component for creating new goal log entries.
 * Includes a date picker (defaulting to today) and a rich text editor.
 * The draft lives here, so collapsing the form keeps it.
 *
 * @example
 * ```tsx
 * <GoalLogCreateForm
 *   onSubmit={async (logDate, content) => {
 *     await createLog(logDate, content);
 *   }}
 *   isSubmitting={isCreating}
 *   expanded={isCreateFormExpanded}
 *   onExpandedChange={handleCreateExpandedChange}
 * />
 * ```
 */
export function GoalLogCreateForm({
  onSubmit,
  isSubmitting = false,
  expanded,
  onExpandedChange,
  disabled = false,
  disabledLabel = 'Switch to current view to add entries',
  triggerRef,
  className,
}: GoalLogCreateFormProps) {
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [logTime, setLogTime] = useState<string>(getTimeFromDate(new Date()));
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** Clears the draft back to now. Only Cancel, Escape, or a successful submit call it. */
  const resetDraft = useCallback(() => {
    setContent('');
    setLogDate(new Date());
    setLogTime(getTimeFromDate(new Date()));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit(content, isSubmitting)) return;

    setError(null);
    try {
      const payload = toSavePayload(logDate, logTime, content);
      await onSubmit(payload.logDate, payload.content);
      resetDraft();
      onExpandedChange(false);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create log entry'));
      console.error('Failed to create log entry:', err);
    }
  }, [content, logDate, logTime, onSubmit, isSubmitting, resetDraft, onExpandedChange]);

  const handleCancel = useCallback(() => {
    resetDraft();
    onExpandedChange(false);
  }, [resetDraft, onExpandedChange]);

  const handleKeyDown = useLogFormKeyDown(handleSubmit, handleCancel, content, isSubmitting);

  // A disabled form never renders its editor, so it cannot be submitted.
  const showForm = expanded && !disabled;

  // Collapsed (or disabled) state - show a button to expand
  if (!showForm) {
    return (
      <div className={cn('border-t pt-4', className)}>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            'w-full justify-start',
            disabled
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => !disabled && onExpandedChange(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          {disabled ? disabledLabel : 'Add log entry...'}
        </Button>
      </div>
    );
  }

  // Expanded state - show the full form
  return (
    <div className={cn('border-t pt-4 space-y-4', className)} onKeyDownCapture={handleKeyDown}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">New Log Entry</h4>
      </div>

      <LogFormFields
        logDate={logDate}
        logTime={logTime}
        content={content}
        error={error}
        onLogDateChange={setLogDate}
        onLogTimeChange={setLogTime}
        onContentChange={setContent}
      />

      <LogFormActions
        isSubmitting={isSubmitting}
        content={content}
        submitLabel="Add Entry"
        submittingLabel="Adding..."
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

/**
 * Editable fields of an open edit. GoalLogSection owns it so it survives a remount.
 */
export interface GoalLogEditDraft {
  logDate: Date;
  logTime: string;
  content: string;
}

/**
 * The draft an edit starts from: the entry's stored values.
 * @param log - The entry being edited
 * @returns The draft fields for that entry
 */
export function editDraftFromLog(log: GoalLog): GoalLogEditDraft {
  const logDate = new Date(log.logDate);
  return { logDate, logTime: getTimeFromDate(logDate), content: log.content };
}

/**
 * Props for the GoalLogEditForm component.
 */
export interface GoalLogEditFormProps {
  /** The draft fields. The parent owns them. */
  draft: GoalLogEditDraft;
  /** Applies a partial change to the draft. */
  onDraftChange: (patch: Partial<GoalLogEditDraft>) => void;
  /** Callback when the entry is saved. Receives the combined timestamp and the cleaned content. */
  onSave: (logDate: number, content: string) => Promise<void>;
  /** Callback when editing is cancelled. */
  onCancel: () => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Form component for editing existing goal log entries.
 * Supports keyboard shortcuts: Cmd/Ctrl+Enter to save, Escape to cancel.
 * The draft is owned by the parent, so remounting this form keeps it.
 *
 * @example
 * ```tsx
 * <GoalLogEditForm
 *   draft={draft}
 *   onDraftChange={updateEditDraft}
 *   onSave={async (logDate, content) => {
 *     await updateLog(editingLog._id, { logDate, content });
 *   }}
 *   onCancel={closeEdit}
 *   isSubmitting={isUpdating}
 * />
 * ```
 */
export function GoalLogEditForm({
  draft,
  onDraftChange,
  onSave,
  onCancel,
  isSubmitting = false,
  className,
}: GoalLogEditFormProps) {
  const { logDate, logTime, content } = draft;
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit(content, isSubmitting)) return;

    setError(null);
    try {
      const payload = toSavePayload(logDate, logTime, content);
      await onSave(payload.logDate, payload.content);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update log entry'));
      console.error('Failed to update log entry:', err);
    }
  }, [content, logDate, logTime, onSave, isSubmitting]);

  const handleKeyDown = useLogFormKeyDown(handleSubmit, onCancel, content, isSubmitting);

  return (
    <div
      className={cn('space-y-4 p-4 border rounded-md bg-muted', className)}
      onKeyDownCapture={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Edit Log Entry</h4>
      </div>

      <LogFormFields
        logDate={logDate}
        logTime={logTime}
        content={content}
        error={error}
        onLogDateChange={(date) => onDraftChange({ logDate: date })}
        onLogTimeChange={(time) => onDraftChange({ logTime: time })}
        onContentChange={(next) => onDraftChange({ content: next })}
      />

      <LogFormActions
        isSubmitting={isSubmitting}
        content={content}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
