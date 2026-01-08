/**
 * @file GoalLogTab component that combines log list and create form.
 * This is the main component to be used in goal detail modals.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { History, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

import { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
import { GoalLogList } from './GoalLogList';

import { Button } from '@/components/ui/button';
import { useGoalLogs, useGoalLogsByRootGoal } from '@/hooks/useGoalLogs';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the GoalLogTab component.
 */
export interface GoalLogTabProps {
  /** The goal ID to display logs for */
  goalId: Id<'goals'>;
  /** Callback when a form becomes active (editing or creating) - used to block dialog escape */
  onFormActiveChange?: (isActive: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main component for the Log tab in goal detail modals.
 * Displays a list of log entries grouped by day with a form to create new entries.
 * Supports viewing full log history across carried-over goal instances.
 *
 * @example
 * ```tsx
 * <GoalLogTab goalId={goal._id} />
 * ```
 */
export function GoalLogTab({ goalId, onFormActiveChange, className }: GoalLogTabProps) {
  const { sessionId } = useSession();
  const {
    logs,
    rootGoalId,
    hasCarryOverHistory,
    isLoading,
    isCreating,
    isUpdating,
    createLog,
    updateLog,
    deleteLog,
  } = useGoalLogs(sessionId, goalId);

  const [editingLog, setEditingLog] = useState<GoalLog | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(false);

  // Notify parent when any form becomes active (for blocking dialog escape)
  const isFormActive = editingLog !== null || isCreateFormExpanded;
  useEffect(() => {
    onFormActiveChange?.(isFormActive);
  }, [isFormActive, onFormActiveChange]);

  // Reset form active state when component unmounts (e.g., when switching tabs)
  useEffect(() => {
    return () => {
      onFormActiveChange?.(false);
    };
  }, [onFormActiveChange]);

  // Fetch full history logs when viewing full history
  const { logs: fullHistoryLogs, isLoading: isLoadingFullHistory } = useGoalLogsByRootGoal(
    sessionId,
    showFullHistory ? (rootGoalId ?? null) : null
  );

  // Determine which logs to display
  const displayedLogs = showFullHistory ? fullHistoryLogs : logs;
  const isLoadingLogs = showFullHistory ? isLoadingFullHistory : isLoading;

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
  if (isLoadingLogs) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with view mode toggle - always reserve space for consistent layout */}
      {hasCarryOverHistory && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {showFullHistory
                ? 'Viewing logs from all instances of this goal'
                : 'Viewing logs for current instance only'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="gap-1.5 text-xs h-7 px-2 shrink-0"
          >
            <History className="h-3.5 w-3.5" />
            {showFullHistory ? 'Current only' : 'Full history'}
          </Button>
        </div>
      )}

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
            logs={displayedLogs ?? []}
            onContentChange={handleContentChange}
            onEdit={setEditingLog}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Create form - fixed at bottom */}
      {!editingLog && (
        <GoalLogCreateForm
          onSubmit={handleCreateLog}
          isSubmitting={isCreating}
          onExpandedChange={setIsCreateFormExpanded}
          disabled={showFullHistory}
          className="mt-4"
        />
      )}
    </div>
  );
}
