/**
 * @file Hooks for managing adhoc goals.
 * Provides CRUD operations and queries for adhoc goals with session-based authentication.
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@workspace/backend/src/constants';
import { useMutation, useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import { useState } from 'react';

/**
 * Hook for managing adhoc goals with CRUD operations.
 *
 * @param sessionId - The current user's session ID
 * @returns Object containing adhoc goals data and mutation functions
 *
 * @example
 * ```tsx
 * const { adhocGoals, createAdhocGoal, updateAdhocGoal } = useAdhocGoals(sessionId);
 * await createAdhocGoal("New task", undefined, undefined, 2024, 48);
 * ```
 */
export function useAdhocGoals(sessionId: SessionId) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const adhocGoals = useQuery(api.adhocGoal.getAllAdhocGoals, { sessionId }) || [];

  // Separate incomplete and completed goals
  const incompleteAdhocGoals = adhocGoals.filter((goal) => !goal.isComplete);
  const completedAdhocGoals = adhocGoals.filter((goal) => goal.isComplete);

  const createAdhocGoalMutation = useMutation(api.adhocGoal.createAdhocGoal);
  const updateAdhocGoalMutation = useMutation(api.adhocGoal.updateAdhocGoal);
  const deleteAdhocGoalMutation = useMutation(api.adhocGoal.deleteAdhocGoal);
  const moveAdhocGoalsFromWeekMutation = useMutation(api.adhocGoal.moveAdhocGoalsFromWeek);
  const moveAdhocGoalsFromDayMutation = useMutation(api.adhocGoal.moveAdhocGoalsFromDay);

  /**
   * Creates a new adhoc goal.
   */
  const createAdhocGoal = async (
    title: string,
    details: string | undefined,
    domainId: Id<'domains'> | undefined,
    year: number,
    weekNumber: number,
    dayOfWeek?: DayOfWeek,
    dueDate?: number,
    parentId?: Id<'goals'>
  ): Promise<Id<'goals'>> => {
    setIsCreating(true);
    try {
      const goalId = await createAdhocGoalMutation({
        sessionId,
        title,
        details,
        domainId,
        year,
        weekNumber,
        dayOfWeek,
        dueDate,
        parentId,
      });
      return goalId;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Updates an existing adhoc goal.
   */
  const updateAdhocGoal = async (
    goalId: Id<'goals'>,
    updates: {
      title?: string;
      details?: string;
      domainId?: Id<'domains'> | null;
      weekNumber?: number;
      dayOfWeek?: DayOfWeek;
      dueDate?: number;
      isComplete?: boolean;
      isBacklog?: boolean;
    }
  ): Promise<void> => {
    setIsUpdating(true);
    try {
      await updateAdhocGoalMutation({
        sessionId,
        goalId,
        ...updates,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Deletes an adhoc goal.
   */
  const deleteAdhocGoal = async (goalId: Id<'goals'>): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteAdhocGoalMutation({
        sessionId,
        goalId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Moves incomplete adhoc goals from one week to another.
   */
  const moveAdhocGoalsFromWeek = async (
    from: { year: number; weekNumber: number },
    to: { year: number; weekNumber: number },
    dryRun = false
  ) => {
    if (!dryRun) {
      setIsMoving(true);
    }
    try {
      const result = await moveAdhocGoalsFromWeekMutation({
        sessionId,
        from,
        to,
        dryRun,
      });
      return result;
    } finally {
      if (!dryRun) {
        setIsMoving(false);
      }
    }
  };

  /**
   * Moves incomplete adhoc goals from one day to another (legacy - adhoc goals are week-level).
   */
  const moveAdhocGoalsFromDay = async (
    from: { year: number; weekNumber: number; dayOfWeek: DayOfWeek },
    to: { year: number; weekNumber: number; dayOfWeek: DayOfWeek },
    dryRun = false
  ) => {
    if (!dryRun) {
      setIsMoving(true);
    }
    try {
      const result = await moveAdhocGoalsFromDayMutation({
        sessionId,
        from,
        to,
        dryRun,
      });
      return result;
    } finally {
      if (!dryRun) {
        setIsMoving(false);
      }
    }
  };

  return {
    adhocGoals,
    incompleteAdhocGoals,
    completedAdhocGoals,
    createAdhocGoal,
    updateAdhocGoal,
    deleteAdhocGoal,
    moveAdhocGoalsFromWeek,
    moveAdhocGoalsFromDay,
    isCreating,
    isUpdating,
    isDeleting,
    isMoving,
  };
}

/**
 * Hook for fetching adhoc goals for a specific week with hierarchical structure.
 *
 * @param sessionId - The current user's session ID
 * @param year - ISO week year
 * @param weekNumber - ISO week number
 * @returns Object containing hierarchical adhoc goals and loading state
 */
export function useAdhocGoalsForWeek(sessionId: SessionId, year: number, weekNumber: number) {
  const adhocGoals =
    useQuery(api.adhocGoal.getAdhocGoalsForWeek, {
      sessionId,
      year,
      weekNumber,
    }) || [];

  return {
    adhocGoals,
    isLoading: adhocGoals === undefined,
  };
}

/**
 * Hook for fetching adhoc goals for a specific day (legacy - returns week goals).
 *
 * @param sessionId - The current user's session ID
 * @param year - ISO week year
 * @param weekNumber - ISO week number
 * @param dayOfWeek - Day of week (kept for compatibility but ignored)
 * @returns Object containing adhoc goals and loading state
 */
export function useAdhocGoalsForDay(
  sessionId: SessionId,
  year: number,
  weekNumber: number,
  dayOfWeek: DayOfWeek
) {
  const adhocGoals =
    useQuery(api.adhocGoal.getAdhocGoalsForDay, {
      sessionId,
      year,
      weekNumber,
      dayOfWeek,
    }) || [];

  return {
    adhocGoals,
    isLoading: adhocGoals === undefined,
  };
}
