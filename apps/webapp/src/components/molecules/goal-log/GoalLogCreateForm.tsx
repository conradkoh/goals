/**
 * @file GoalLogCreateForm component for creating new log entries.
 * Features a date picker and rich text editor for content.
 */

import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { CalendarIcon, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor, isHTMLEmpty } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

/**
 * Props for the GoalLogCreateForm component.
 */
export interface GoalLogCreateFormProps {
  /** Callback when a new log entry is submitted */
  onSubmit: (logDate: number, content: string) => Promise<void>;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
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
  className,
}: GoalLogCreateFormProps) {
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = DateTime.fromJSDate(logDate).toFormat('LLL dd, yyyy');
  const isToday = DateTime.fromJSDate(logDate).hasSame(DateTime.now(), 'day');

  const handleSubmit = useCallback(async () => {
    if (isHTMLEmpty(content) || isSubmitting) return;

    try {
      await onSubmit(logDate.getTime(), content);
      // Reset form after successful submission
      setContent('');
      setIsExpanded(false);
      setLogDate(new Date()); // Reset to today
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Failed to create log entry:', error);
    }
  }, [content, logDate, onSubmit, isSubmitting]);

  const handleCancel = useCallback(() => {
    setContent('');
    setIsExpanded(false);
    setLogDate(new Date());
  }, []);

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
    <div className={cn('border-t pt-4 space-y-4', className)}>
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

  const formattedDate = DateTime.fromJSDate(logDate).toFormat('LLL dd, yyyy');
  const isToday = DateTime.fromJSDate(logDate).hasSame(DateTime.now(), 'day');

  const handleSubmit = useCallback(async () => {
    if (isHTMLEmpty(content) || isSubmitting) return;

    try {
      await onSave(logDate.getTime(), content);
    } catch (error) {
      console.error('Failed to update log entry:', error);
    }
  }, [content, logDate, onSave, isSubmitting]);

  return (
    <div className={cn('space-y-4 p-4 border rounded-md bg-muted/20', className)}>
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
