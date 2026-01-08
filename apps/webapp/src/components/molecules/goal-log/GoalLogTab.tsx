/**
 * @file GoalLogTab component that combines log list and create form.
 * This is the main component to be used in goal detail modals.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

import { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
import { GoalLogList } from './GoalLogList';

import { useGoalLogs } from '@/hooks/useGoalLogs';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the GoalLogTab component.
 */
export interface GoalLogTabProps {
  /** The goal ID to display logs for */
  goalId: Id<'goals'>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main component for the Log tab in goal detail modals.
 * Displays a list of log entries grouped by day with a form to create new entries.
 *
 * @example
 * ```tsx
 * <GoalLogTab goalId={goal._id} />
 * ```
 */
export function GoalLogTab({ goalId, className }: GoalLogTabProps) {
  const { sessionId } = useSession();
  const { logs, isLoading, isCreating, isUpdating, createLog, updateLog, deleteLog } = useGoalLogs(
    sessionId,
    goalId
  );
  const [editingLog, setEditingLog] = useState<GoalLog | null>(null);

  /**
   * Handles creating a new log entry.
   */
  const handleCreateLog = useCallback(
    async (logDate: number, content: string) => {
      await createLog(logDate, content);
    },
    [createLog]
  );

  /**
   * Handles updating log content (e.g., from interactive checkboxes).
   */
  const handleContentChange = useCallback(
    async (logId: Id<'goalLogs'>, newContent: string) => {
      await updateLog(logId, { content: newContent });
    },
    [updateLog]
  );

  /**
   * Handles saving an edited log entry.
   */
  const handleSaveEdit = useCallback(
    async (logDate: number, content: string) => {
      if (!editingLog) return;
      await updateLog(editingLog._id, { logDate, content });
      setEditingLog(null);
    },
    [editingLog, updateLog]
  );

  /**
   * Handles deleting a log entry.
   */
  const handleDelete = useCallback(
    async (logId: Id<'goalLogs'>) => {
      await deleteLog(logId);
    },
    [deleteLog]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Log list - scrollable area */}
      <div className="flex-1 overflow-y-auto pr-2">
        {editingLog ? (
          <GoalLogEditForm
            log={editingLog}
            onSave={handleSaveEdit}
            onCancel={() => setEditingLog(null)}
            isSubmitting={isUpdating}
          />
        ) : (
          <GoalLogList
            logs={logs ?? []}
            onContentChange={handleContentChange}
            onEdit={setEditingLog}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Create form - fixed at bottom */}
      {!editingLog && (
        <GoalLogCreateForm onSubmit={handleCreateLog} isSubmitting={isCreating} className="mt-4" />
      )}
    </div>
  );
}
