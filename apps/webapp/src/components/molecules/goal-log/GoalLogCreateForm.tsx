/**
 * @file GoalLogCreateForm component for creating new log entries.
 * Features a date picker and rich text editor for content.
 * Supports keyboard shortcuts: Cmd/Ctrl+Enter to submit, Escape to cancel.
 */

import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { CalendarIcon, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isHTMLEmpty, RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

/**
 * Props for the GoalLogCreateForm component.
 */
export interface GoalLogCreateFormProps {
  /** Callback when a new log entry is submitted */
  onSubmit: (logDate: number, content: string) => Promise<void>;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Callback when the form's expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Form component for creating new goal log entries.
 * Includes a date picker (defaulting to today) and a rich text editor.
 *
 * @example
 * ```tsx
 * <GoalLogCreateForm
 *   onSubmit={async (logDate, content) => {
 *     await createLog(logDate, content);
 *   }}
 *   isSubmitting={isCreating}
 * />
 * ```
 */
export function GoalLogCreateForm({
  onSubmit,
  isSubmitting = false,
  onExpandedChange,
  className,
}: GoalLogCreateFormProps) {
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpandedInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = DateTime.fromJSDate(logDate).toFormat('LLL dd, yyyy');
  const isToday = DateTime.fromJSDate(logDate).hasSame(DateTime.now(), 'day');

  // Wrapper to notify parent when expanded state changes
  const setIsExpanded = useCallback(
    (expanded: boolean) => {
      setIsExpandedInternal(expanded);
      onExpandedChange?.(expanded);
    },
    [onExpandedChange]
  );

  const handleSubmit = useCallback(async () => {
    if (isHTMLEmpty(content) || isSubmitting) return;

    setError(null);
    try {
      await onSubmit(logDate.getTime(), content);
      // Reset form after successful submission
      setContent('');
      setIsExpanded(false);
      setLogDate(new Date()); // Reset to today
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create log entry';
      setError(message);
      console.error('Failed to create log entry:', err);
    }
  }, [content, logDate, onSubmit, isSubmitting, setIsExpanded]);

  const handleCancel = useCallback(() => {
    setContent('');
    setIsExpanded(false);
    setLogDate(new Date());
    setError(null);
  }, [setIsExpanded]);

  /**
   * Handles keyboard shortcuts for the form.
   * - Cmd/Ctrl+Enter: Submit the form
   * - Escape: Cancel and collapse the form (prevents dialog from closing)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isHTMLEmpty(content) && !isSubmitting) {
          handleSubmit();
        }
        return;
      }

      // Escape to cancel (only if not in a popover or other modal)
      if (e.key === 'Escape') {
        // Check if we're inside a popover (calendar picker)
        const target = e.target as HTMLElement;
        const isInPopover = target.closest('[data-radix-popper-content-wrapper]');
        if (!isInPopover) {
          e.preventDefault();
          e.stopPropagation();
          handleCancel();
        }
      }
    },
    [content, isSubmitting, handleSubmit, handleCancel]
  );

  // Collapsed state - show a button to expand
  if (!isExpanded) {
    return (
      <div className={cn('border-t pt-4', className)}>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add log entry...
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

      {/* Date picker */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
        <label className="text-sm font-medium text-muted-foreground">Log Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !logDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {isToday ? `Today (${formattedDate})` : formattedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={logDate}
              onSelect={(date) => date && setLogDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with RichTextEditor below */}
        <label className="text-sm font-medium text-muted-foreground">Content</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="What happened? What progress was made? Any blockers or issues?"
        />
        {error && (
          <p className="text-sm text-destructive mt-2" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isHTMLEmpty(content) || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Entry'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Props for the GoalLogEditForm component.
 */
export interface GoalLogEditFormProps {
  /** The log entry being edited */
  log: GoalLog;
  /** Callback when the log entry is saved */
  onSave: (logDate: number, content: string) => Promise<void>;
  /** Callback when editing is cancelled */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Form component for editing existing goal log entries.
 * Supports keyboard shortcuts: Cmd/Ctrl+Enter to save, Escape to cancel.
 *
 * @example
 * ```tsx
 * <GoalLogEditForm
 *   log={selectedLog}
 *   onSave={async (logDate, content) => {
 *     await updateLog(selectedLog._id, { logDate, content });
 *   }}
 *   onCancel={() => setEditingLog(null)}
 *   isSubmitting={isUpdating}
 * />
 * ```
 */
export function GoalLogEditForm({
  log,
  onSave,
  onCancel,
  isSubmitting = false,
  className,
}: GoalLogEditFormProps) {
  const [logDate, setLogDate] = useState<Date>(new Date(log.logDate));
  const [content, setContent] = useState(log.content);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = DateTime.fromJSDate(logDate).toFormat('LLL dd, yyyy');
  const isToday = DateTime.fromJSDate(logDate).hasSame(DateTime.now(), 'day');

  const handleSubmit = useCallback(async () => {
    if (isHTMLEmpty(content) || isSubmitting) return;

    setError(null);
    try {
      await onSave(logDate.getTime(), content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update log entry';
      setError(message);
      console.error('Failed to update log entry:', err);
    }
  }, [content, logDate, onSave, isSubmitting]);

  /**
   * Handles keyboard shortcuts for the form.
   * - Cmd/Ctrl+Enter: Save the changes
   * - Escape: Cancel editing (prevents dialog from closing)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isHTMLEmpty(content) && !isSubmitting) {
          handleSubmit();
        }
        return;
      }

      // Escape to cancel (only if not in a popover or other modal)
      if (e.key === 'Escape') {
        // Check if we're inside a popover (calendar picker)
        const target = e.target as HTMLElement;
        const isInPopover = target.closest('[data-radix-popper-content-wrapper]');
        if (!isInPopover) {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }
    },
    [content, isSubmitting, handleSubmit, onCancel]
  );

  return (
    <div
      className={cn('space-y-4 p-4 border rounded-md bg-muted/20', className)}
      onKeyDownCapture={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Edit Log Entry</h4>
      </div>

      {/* Date picker */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
        <label className="text-sm font-medium text-muted-foreground">Log Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !logDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {isToday ? `Today (${formattedDate})` : formattedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={logDate}
              onSelect={(date) => date && setLogDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with RichTextEditor below */}
        <label className="text-sm font-medium text-muted-foreground">Content</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="What happened? What progress was made? Any blockers or issues?"
        />
        {error && (
          <p className="text-sm text-destructive mt-2" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isHTMLEmpty(content) || isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
