import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@services/backend/src/constants';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

export function useAdhocGoals(sessionId: Id<'sessions'>) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const adhocGoals = useQuery(api.adhocGoal.getAllAdhocGoals, { sessionId }) || [];

  const createAdhocGoalMutation = useMutation(api.adhocGoal.createAdhocGoal);
  const updateAdhocGoalMutation = useMutation(api.adhocGoal.updateAdhocGoal);
  const deleteAdhocGoalMutation = useMutation(api.adhocGoal.deleteAdhocGoal);

  const createAdhocGoal = async (
    title: string,
    details?: string,
    domainId?: Id<'domains'>,
    weekNumber?: number,
    dayOfWeek?: DayOfWeek,
    dueDate?: number
  ): Promise<Id<'goals'>> => {
    setIsCreating(true);
    try {
      const goalId = await createAdhocGoalMutation({
        sessionId,
        title,
        details,
        domainId,
        weekNumber: weekNumber || getCurrentISOWeekNumber(),
        dayOfWeek,
        dueDate,
      });
      return goalId;
    } finally {
      setIsCreating(false);
    }
  };

  const updateAdhocGoal = async (
    goalId: Id<'goals'>,
    updates: {
      title?: string;
      details?: string;
      domainId?: Id<'domains'>;
      weekNumber?: number;
      dayOfWeek?: DayOfWeek;
      dueDate?: number;
      isComplete?: boolean;
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

  return {
    adhocGoals,
    createAdhocGoal,
    updateAdhocGoal,
    deleteAdhocGoal,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

export function useAdhocGoalsForWeek(sessionId: Id<'sessions'>, year: number, weekNumber: number) {
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

export function useAdhocGoalsForDay(
  sessionId: Id<'sessions'>,
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

function getCurrentISOWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
