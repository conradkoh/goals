import { memo, useMemo } from 'react';

import { MultiWeekGenerator } from '../../../molecules/multi-week/MultiWeekContext';
import { MultiWeekLayout } from '../../../molecules/multi-week/MultiWeekLayout';

import {
  MoveGoalsForQuarterProvider,
  useMoveGoalsForQuarterContext,
} from '@/hooks/useMoveGoalsForQuarterContext';

export interface FocusModeQuarterlyViewProps {
  year?: number;
  quarter?: number;
}

// Inner component that uses the context
const FocusModeQuarterlyViewInner = ({
  year = new Date().getFullYear(),
  quarter = Math.floor(new Date().getMonth() / 3) + 1,
}: FocusModeQuarterlyViewProps) => {
  // Get the context for moving goals
  const { isFirstQuarter, isMovingGoals, isDisabled, handlePreviewGoals, dialog } =
    useMoveGoalsForQuarterContext();

  // Generate a key that changes when year or quarter changes
  const instanceKey = `quarterly-view-${year}-${quarter}`;

  // Calculate the start and end dates of the quarter
  const { startOfQuarter, endOfQuarter } = useMemo(() => {
    // Quarter is 1-based (1-4), but Date month is 0-based (0-11)
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;

    // Create start date (first day of the first month of the quarter)
    const startDate = new Date(year, startMonth, 1);

    // Create end date (last day of the last month of the quarter)
    const endDate = new Date(year, endMonth + 1, 0);

    return {
      startOfQuarter: startDate,
      endOfQuarter: endDate,
    };
  }, [year, quarter]);

  // Tooltip content for the quarter action menu
  const tooltipContent = isFirstQuarter
    ? 'Cannot pull goals from previous quarter as this is the first quarter'
    : isMovingGoals
      ? 'Moving goals...'
      : "Can't pull from previous quarter";

  // Suppress unused variable warnings - these are prepared for QuarterActionMenu
  void isDisabled;
  void isFirstQuarter;
  void isMovingGoals;
  void handlePreviewGoals;
  void tooltipContent;

  return (
    <div id="focus-mode-quarterly-view" className="w-full h-full" key={instanceKey}>
      <MultiWeekGenerator startDate={startOfQuarter} endDate={endOfQuarter}>
        <MultiWeekLayout />
      </MultiWeekGenerator>

      {dialog}
    </div>
  );
};

// Main component that provides the context
export const FocusModeQuarterlyView = memo(
  ({
    year = new Date().getFullYear(),
    quarter = Math.floor(new Date().getMonth() / 3) + 1,
  }: FocusModeQuarterlyViewProps) => {
    return (
      <MoveGoalsForQuarterProvider year={year} quarter={quarter as 1 | 2 | 3 | 4}>
        <FocusModeQuarterlyViewInner year={year} quarter={quarter} />
      </MoveGoalsForQuarterProvider>
    );
  }
);

FocusModeQuarterlyView.displayName = 'FocusModeQuarterlyView';
