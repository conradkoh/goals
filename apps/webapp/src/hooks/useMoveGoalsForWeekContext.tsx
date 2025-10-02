import type { DayOfWeek } from '@services/backend/src/constants';
import type React from 'react';
import { createContext, type ReactNode, useContext } from 'react';
import { useMoveGoalsForWeek } from './useMoveGoalsForWeek';

interface MoveGoalsForWeekContextProps {
  weekNumber: number;
  year: number;
  quarter: number;
}

interface MoveGoalsForWeekContextValue {
  isFirstWeek: boolean;
  isMovingTasks: boolean;
  isDisabled: boolean;
  handlePreviewTasks: (dayOfWeek?: DayOfWeek) => Promise<void>;
  dialog: React.ReactElement;
}

const MoveGoalsForWeekContext = createContext<MoveGoalsForWeekContextValue | null>(null);

export const MoveGoalsForWeekProvider: React.FC<
  MoveGoalsForWeekContextProps & { children: ReactNode }
> = ({ weekNumber, year, quarter, children }) => {
  const { isFirstWeek, isMovingTasks, handlePreviewTasks, dialog } = useMoveGoalsForWeek({
    weekNumber,
    year,
    quarter,
  });

  // Calculate isDisabled once here instead of in multiple components
  const isDisabled = isFirstWeek || isMovingTasks;

  const value = {
    isFirstWeek,
    isMovingTasks,
    isDisabled,
    handlePreviewTasks,
    dialog,
  };

  return (
    <MoveGoalsForWeekContext.Provider value={value}>{children}</MoveGoalsForWeekContext.Provider>
  );
};

export const useMoveGoalsForWeekContext = () => {
  const context = useContext(MoveGoalsForWeekContext);
  if (!context) {
    throw new Error('useMoveGoalsForWeekContext must be used within a MoveGoalsForWeekProvider');
  }
  return context;
};
