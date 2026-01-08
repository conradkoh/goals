/**
 * @file GoalLogEntry component for displaying individual log entries.
 * Shows date, content, and action buttons for editing/deleting.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InteractiveHTML } from '@/components/ui/interactive-html';
import { cn } from '@/lib/utils';

/**
 * Props for the GoalLogEntry component.
 */
export interface GoalLogEntryProps {
  /** The log entry to display */
  log: GoalLog;
  /** Whether to show the date header (used when grouping by day) */
  showDate?: boolean;
  /** Callback when the log content is updated (for interactive checkboxes) */
  onContentChange?: (logId: Id<'goalLogs'>, newContent: string) => void;
  /** Callback when edit is requested */
  onEdit?: (log: GoalLog) => void;
  /** Callback when delete is requested */
  onDelete?: (logId: Id<'goalLogs'>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a single goal log entry with interactive content and action buttons.
 * Supports markdown/HTML rendering with interactive task lists.
 *
 * @example
 * ```tsx
 * <GoalLogEntry
 *   log={logEntry}
 *   showDate={true}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function GoalLogEntry({
  log,
  showDate = false,
  onContentChange,
  onEdit,
  onDelete,
  className,
}: GoalLogEntryProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const logDateTime = DateTime.fromMillis(log.logDate);
  const formattedDate = logDateTime.toFormat('EEEE, MMMM d, yyyy');
  const formattedTime = DateTime.fromMillis(log.createdAt).toFormat('h:mm a');

  const handleContentChange = useCallback(
    (newContent: string) => {
      onContentChange?.(log._id, newContent);
    },
    [log._id, onContentChange]
  );

  const handleDeleteClick = useCallback(() => {
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!onDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(log._id);
      // Only close dialog if still mounted and delete succeeded
      setIsDeleteDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete log entry';
      setDeleteError(message);
      console.error('Failed to delete log entry:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [log._id, onDelete, isDeleting]);

  return (
    <>
      <div className={cn('group', className)}>
        {/* Date header - only shown when showDate is true */}
        {showDate && (
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{formattedDate}</span>
          </div>
        )}

        {/* Log entry content */}
        <div className="relative rounded-md bg-muted/30 p-3">
          {/* Action buttons - top right, visible on hover */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(log)}
                title="Edit log entry"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteClick}
                title="Delete log entry"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Content */}
          <InteractiveHTML
            html={log.content}
            className="text-sm prose prose-sm dark:prose-invert max-w-none pr-12"
            onContentChange={onContentChange ? handleContentChange : undefined}
            readOnly={!onContentChange}
          />

          {/* Timestamp - bottom right */}
          <div className="flex justify-end mt-2">
            <span className="text-xs text-muted-foreground">{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Log Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this log entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
