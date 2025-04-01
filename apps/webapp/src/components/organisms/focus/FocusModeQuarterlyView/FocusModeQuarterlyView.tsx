import React, { useMemo, memo } from 'react';
import { MultiWeekGenerator } from '../../../molecules/multi-week/MultiWeekContext';
import { MultiWeekLayout } from '../../../molecules/multi-week/MultiWeekLayout';
import {
  MoveGoalsForQuarterProvider,
  useMoveGoalsForQuarterContext,
} from '@/hooks/useMoveGoalsForQuarterContext';
import { QuarterActionMenu } from '@/components/molecules/quarter/QuarterActionMenu';

export interface FocusModeQuarterlyViewProps {
  year?: number;
  quarter?: number;
  hideActionMenu?: boolean;
}

// Inner component that uses the context
const FocusModeQuarterlyViewInner = ({
  year = new Date().getFullYear(),
  quarter = Math.floor(new Date().getMonth() / 3) + 1,
  hideActionMenu = false,
}: FocusModeQuarterlyViewProps) => {
  // Get the context for moving goals
  const {
    isFirstQuarter,
    isMovingGoals,
    isDisabled,
    handlePreviewGoals,
    dialog,
  } = useMoveGoalsForQuarterContext();

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

  // Memoize the QuarterActionMenu props
  const quarterActionMenuProps = useMemo(
    () => ({
      isDisabled,
      isFirstQuarter,
      isMovingGoals,
      handlePreviewGoals,
      tooltipContent,
      buttonSize: 'default' as const,
      showLabel: true,
    }),
    [
      isDisabled,
      isFirstQuarter,
      isMovingGoals,
      handlePreviewGoals,
      tooltipContent,
    ]
  );

  return (
    <div
      id="focus-mode-quarterly-view"
      className="w-full h-full"
      key={instanceKey}
    >
      {!hideActionMenu && (
        <div className="flex justify-end mb-4 px-4">
          <QuarterActionMenu {...quarterActionMenuProps} />
        </div>
      )}

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
    hideActionMenu = false,
  }: FocusModeQuarterlyViewProps) => {
    return (
      <MoveGoalsForQuarterProvider
        year={year}
        quarter={quarter as 1 | 2 | 3 | 4}
      >
        <FocusModeQuarterlyViewInner
          year={year}
          quarter={quarter}
          hideActionMenu={hideActionMenu}
        />
      </MoveGoalsForQuarterProvider>
    );
  }
);

FocusModeQuarterlyView.displayName = 'FocusModeQuarterlyView';
