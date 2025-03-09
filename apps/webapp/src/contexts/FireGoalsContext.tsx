import React, { createContext, useContext, ReactNode } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { api } from '@services/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useSession } from '@/modules/auth/useSession';

interface FireGoalsContextType {
  fireGoals: Set<string>;
  toggleFireStatus: (goalId: Id<'goals'>) => void;
  isOnFire: (goalId: Id<'goals'>) => boolean;
}

const FireGoalsContext = createContext<FireGoalsContextType | undefined>(
  undefined
);

export const useFireGoals = (): FireGoalsContextType => {
  const context = useContext(FireGoalsContext);
  if (!context) {
    throw new Error('useFireGoals must be used within a FireGoalsProvider');
  }
  return context;
};

interface FireGoalsProviderProps {
  children: ReactNode;
}

export const FireGoalsProvider: React.FC<FireGoalsProviderProps> = ({
  children,
}) => {
  const { sessionId } = useSession();
  const toggleFireStatusMutation = useMutation(api.fireGoal.toggleFireStatus);
  const fireGoalsQuery = useQuery(api.fireGoal.getFireGoals, { sessionId });

  // Convert array to Set if query is ready, otherwise use empty set
  const fireGoals = new Set(
    (fireGoalsQuery ?? []).map((goalId) => goalId.toString())
  );

  const toggleFireStatus = async (goalId: Id<'goals'>) => {
    if (!sessionId) return;
    await toggleFireStatusMutation({ sessionId, goalId });
  };

  const isOnFire = (goalId: Id<'goals'>) => {
    return fireGoals.has(goalId.toString());
  };

  const value = {
    fireGoals,
    toggleFireStatus,
    isOnFire,
  };

  return (
    <FireGoalsContext.Provider value={value}>
      {children}
    </FireGoalsContext.Provider>
  );
};
