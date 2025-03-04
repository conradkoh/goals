import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';

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
  // Use a Set to store the IDs of goals that are "on fire"
  const [fireGoals, setFireGoals] = useState<Set<string>>(new Set());

  const toggleFireStatus = (goalId: Id<'goals'>) => {
    setFireGoals((prevFireGoals) => {
      const newFireGoals = new Set(prevFireGoals);
      const goalIdStr = goalId.toString();

      if (newFireGoals.has(goalIdStr)) {
        newFireGoals.delete(goalIdStr);
      } else {
        newFireGoals.add(goalIdStr);
      }

      return newFireGoals;
    });
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
