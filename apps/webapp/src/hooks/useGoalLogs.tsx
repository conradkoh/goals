/**
 * @file Hook for managing goal logs.
 * Provides CRUD operations and queries for goal log entries with session-based authentication.
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { useMutation, useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import { useState, useCallback } from 'react';

/**
 * Hook for managing goal logs with CRUD operations.
 *
 * @param sessionId - The current user's session ID
 * @param goalId - The goal ID to fetch logs for
 * @returns Object containing goal logs data and mutation functions
 *
 * @example
 * ```tsx
 * const { logs, createLog, updateLog, deleteLog, isLoading } = useGoalLogs(sessionId, goalId);
 * await createLog(Date.now(), "<p>Made progress today</p>");
 * ```
 */
export function useGoalLogs(sessionId: SessionId | null, goalId: Id<'goals'> | null) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query logs for the goal
  const logs =
    useQuery(api.goalLogs.getGoalLogs, sessionId && goalId ? { sessionId, goalId } : 'skip') ??
    undefined;

  const isLoading = logs === undefined;

  // Mutations
  const createLogMutation = useMutation(api.goalLogs.createGoalLog);
  const updateLogMutation = useMutation(api.goalLogs.updateGoalLog);
  const deleteLogMutation = useMutation(api.goalLogs.deleteGoalLog);

  /**
   * Creates a new goal log entry.
   *
   * @param logDate - Unix timestamp for the date the log is for
   * @param content - HTML/markdown content for the log entry
   * @returns Promise resolving to the new log entry ID
   */
  const createLog = useCallback(
    async (logDate: number, content: string): Promise<Id<'goalLogs'> | null> => {
      if (!sessionId || !goalId) return null;

      setIsCreating(true);
      try {
        const logId = await createLogMutation({
          sessionId,
          goalId,
          logDate,
          content,
        });
        return logId;
      } finally {
        setIsCreating(false);
      }
    },
    [sessionId, goalId, createLogMutation]
  );

  /**
   * Updates an existing goal log entry.
   *
   * @param logId - The ID of the log entry to update
   * @param updates - Object containing optional content and logDate updates
   */
  const updateLog = useCallback(
    async (
      logId: Id<'goalLogs'>,
      updates: {
        content?: string;
        logDate?: number;
      }
    ): Promise<void> => {
      if (!sessionId) return;

      setIsUpdating(true);
      try {
        await updateLogMutation({
          sessionId,
          logId,
          ...updates,
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [sessionId, updateLogMutation]
  );

  /**
   * Deletes a goal log entry.
   *
   * @param logId - The ID of the log entry to delete
   */
  const deleteLog = useCallback(
    async (logId: Id<'goalLogs'>): Promise<void> => {
      if (!sessionId) return;

      setIsDeleting(true);
      try {
        await deleteLogMutation({
          sessionId,
          logId,
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [sessionId, deleteLogMutation]
  );

  return {
    /** Array of goal log entries, sorted by date descending */
    logs: logs as GoalLog[] | undefined,
    /** Whether the logs are currently loading */
    isLoading,
    /** Whether a log is currently being created */
    isCreating,
    /** Whether a log is currently being updated */
    isUpdating,
    /** Whether a log is currently being deleted */
    isDeleting,
    /** Creates a new log entry */
    createLog,
    /** Updates an existing log entry */
    updateLog,
    /** Deletes a log entry */
    deleteLog,
  };
}
