import React, { createContext, useContext, ReactNode } from 'react';
import { useMoveGoalsForWeek } from './useMoveGoalsForWeek';
import { DayOfWeek } from '@services/backend/src/constants';

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

const MoveGoalsForWeekContext =
  createContext<MoveGoalsForWeekContextValue | null>(null);

export const MoveGoalsForWeekProvider: React.FC<
  MoveGoalsForWeekContextProps & { children: ReactNode }
> = ({ weekNumber, year, quarter, children }) => {
  const { isFirstWeek, isMovingTasks, handlePreviewTasks, dialog } =
    useMoveGoalsForWeek({
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
    <MoveGoalsForWeekContext.Provider value={value}>
      {children}
    </MoveGoalsForWeekContext.Provider>
  );
};

export const useMoveGoalsForWeekContext = () => {
  const context = useContext(MoveGoalsForWeekContext);
  if (!context) {
    throw new Error(
      'useMoveGoalsForWeekContext must be used within a MoveGoalsForWeekProvider'
    );
  }
  return context;
};
