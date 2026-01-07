import type React from 'react';
import { createContext, type ReactNode, useContext } from 'react';

import { useMoveGoalsForQuarter } from './useMoveGoalsForQuarter';

interface MoveGoalsForQuarterContextProps {
  year: number;
  quarter: number;
}

interface MoveGoalsForQuarterProviderProps extends MoveGoalsForQuarterContextProps {
  children: ReactNode;
}

type MoveGoalsForQuarterContextType = ReturnType<typeof useMoveGoalsForQuarter>;

export const MoveGoalsForQuarterContext = createContext<MoveGoalsForQuarterContextType | null>(
  null
);

export const MoveGoalsForQuarterProvider: React.FC<MoveGoalsForQuarterProviderProps> = ({
  children,
  year,
  quarter,
}) => {
  const moveGoalsForQuarterData = useMoveGoalsForQuarter({
    year,
    quarter,
  });

  return (
    <MoveGoalsForQuarterContext.Provider value={moveGoalsForQuarterData}>
      {children}
    </MoveGoalsForQuarterContext.Provider>
  );
};

export const useMoveGoalsForQuarterContext = () => {
  const context = useContext(MoveGoalsForQuarterContext);
  if (!context) {
    throw new Error(
      'useMoveGoalsForQuarterContext must be used within a MoveGoalsForQuarterProvider'
    );
  }
  return context;
};
