import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { createContext, type ReactNode, useContext, useState } from 'react';

interface GoalEditContextType {
  isEditing: boolean;
  editingGoal: GoalWithDetailsAndChildren | null;
  startEditing: (goal: GoalWithDetailsAndChildren) => void;
  stopEditing: () => void;
}

const GoalEditContext = createContext<GoalEditContextType | undefined>(undefined);

export function useGoalEditContext() {
  const context = useContext(GoalEditContext);
  if (context === undefined) {
    throw new Error('useGoalEditContext must be used within a GoalEditProvider');
  }
  return context;
}

interface GoalEditProviderProps {
  children: ReactNode;
}

export function GoalEditProvider({ children }: GoalEditProviderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithDetailsAndChildren | null>(null);

  const startEditing = (goal: GoalWithDetailsAndChildren) => {
    setEditingGoal(goal);
    setIsEditing(true);
  };

  const stopEditing = () => {
    setIsEditing(false);
    setEditingGoal(null);
  };

  const value = {
    isEditing,
    editingGoal,
    startEditing,
    stopEditing,
  };

  return <GoalEditContext.Provider value={value}>{children}</GoalEditContext.Provider>;
}
