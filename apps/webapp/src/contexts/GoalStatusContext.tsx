import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';

import { useSession } from '@/modules/auth/useSession';

/**
 * Context type for goal status management including fire and pending states.
 */
interface GoalStatusContextType {
  fireGoals: Set<string>;
  toggleFireStatus: (goalId: Id<'goals'>) => void;
  isOnFire: (goalId: Id<'goals'>) => boolean;
  pendingGoals: Map<string, string>;
  isPending: (goalId: Id<'goals'>) => boolean;
  getPendingDescription: (goalId: Id<'goals'>) => string | undefined;
  setPendingStatus: (goalId: Id<'goals'>, description: string) => void;
  clearPendingStatus: (goalId: Id<'goals'>) => void;
}

/**
 * Props for the goal status provider component.
 */
interface GoalStatusProviderProps {
  children: ReactNode;
}

const _GoalStatusContext = createContext<GoalStatusContextType | undefined>(undefined);

/**
 * Hook to access goal status context with error handling.
 */
export const useGoalStatus = (): GoalStatusContextType => {
  const context = useContext(_GoalStatusContext);
  if (!context) {
    throw new Error('useGoalStatus must be used within a GoalStatusProvider');
  }
  return context;
};

/**
 * Legacy hook for backward compatibility with fire goals functionality.
 */
export const useFireGoals = (): Pick<
  GoalStatusContextType,
  'fireGoals' | 'toggleFireStatus' | 'isOnFire'
> => {
  const { fireGoals, toggleFireStatus, isOnFire } = useGoalStatus();
  return { fireGoals, toggleFireStatus, isOnFire };
};

/**
 * Hook to manage fire goal status for a specific goal.
 */
export const useFireGoalStatus = (goalId: Id<'goals'>) => {
  const { isOnFire, toggleFireStatus } = useGoalStatus();

  return useMemo(
    () => ({
      isOnFire: isOnFire(goalId),
      toggleFireStatus: (id: Id<'goals'>) => toggleFireStatus(id),
    }),
    [goalId, isOnFire, toggleFireStatus]
  );
};

/**
 * Hook to manage pending goal status for a specific goal.
 */
export const usePendingGoalStatus = (goalId: Id<'goals'>) => {
  const { isPending, getPendingDescription, setPendingStatus, clearPendingStatus } =
    useGoalStatus();

  const _setPendingStatus = useCallback(
    (description: string) => setPendingStatus(goalId, description),
    [goalId, setPendingStatus]
  );

  const _clearPendingStatus = useCallback(
    () => clearPendingStatus(goalId),
    [goalId, clearPendingStatus]
  );

  return useMemo(
    () => ({
      isPending: isPending(goalId),
      pendingDescription: getPendingDescription(goalId),
      setPendingStatus: _setPendingStatus,
      clearPendingStatus: _clearPendingStatus,
    }),
    [goalId, isPending, getPendingDescription, _setPendingStatus, _clearPendingStatus]
  );
};

/**
 * Provides goal status context for fire and pending goal management.
 */
export const GoalStatusProvider: React.FC<GoalStatusProviderProps> = ({ children }) => {
  const { sessionId } = useSession();

  const _toggleFireStatusMutation = useMutation(api.fireGoal.toggleFireStatus);
  const _fireGoalsQuery = useQuery(api.fireGoal.getFireGoals, { sessionId });

  const _setPendingStatusMutation = useMutation(api.pendingGoals.setPendingStatus);
  const _clearPendingStatusMutation = useMutation(api.pendingGoals.clearPendingStatus);
  const _pendingGoalsQuery = useQuery(api.pendingGoals.getPendingGoals, {
    sessionId,
  });

  const fireGoals = useMemo(
    () => new Set((_fireGoalsQuery ?? []).map((goalId) => goalId.toString())),
    [_fireGoalsQuery]
  );

  const pendingGoals = useMemo(
    () => new Map((_pendingGoalsQuery ?? []).map((pg) => [pg.goalId.toString(), pg.description])),
    [_pendingGoalsQuery]
  );

  const toggleFireStatus = useCallback(
    async (goalId: Id<'goals'>) => {
      if (!sessionId) return;
      await _toggleFireStatusMutation({ sessionId, goalId });
    },
    [sessionId, _toggleFireStatusMutation]
  );

  const isOnFire = useCallback(
    (goalId: Id<'goals'>) => fireGoals.has(goalId.toString()),
    [fireGoals]
  );

  const setPendingStatus = useCallback(
    async (goalId: Id<'goals'>, description: string) => {
      if (!sessionId) return;
      await _setPendingStatusMutation({ sessionId, goalId, description });
    },
    [sessionId, _setPendingStatusMutation]
  );

  const clearPendingStatus = useCallback(
    async (goalId: Id<'goals'>) => {
      if (!sessionId) return;
      await _clearPendingStatusMutation({ sessionId, goalId });
    },
    [sessionId, _clearPendingStatusMutation]
  );

  const isPending = useCallback(
    (goalId: Id<'goals'>) => pendingGoals.has(goalId.toString()),
    [pendingGoals]
  );

  const getPendingDescription = useCallback(
    (goalId: Id<'goals'>) => pendingGoals.get(goalId.toString()),
    [pendingGoals]
  );

  const value = useMemo(
    () => ({
      fireGoals,
      toggleFireStatus,
      isOnFire,
      pendingGoals,
      isPending,
      getPendingDescription,
      setPendingStatus,
      clearPendingStatus,
    }),
    [
      fireGoals,
      toggleFireStatus,
      isOnFire,
      pendingGoals,
      isPending,
      getPendingDescription,
      setPendingStatus,
      clearPendingStatus,
    ]
  );

  return <_GoalStatusContext.Provider value={value}>{children}</_GoalStatusContext.Provider>;
};

/**
 * Legacy provider alias for backward compatibility.
 */
export const FireGoalsProvider = GoalStatusProvider;
