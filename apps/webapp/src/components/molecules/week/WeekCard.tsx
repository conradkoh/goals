import { Button } from '@/components/ui/button';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { Focus } from 'lucide-react';
import { DayOfWeek } from '@services/backend/src/constants';
import { WeekActionMenu } from './WeekActionMenu';
import { useMemo } from 'react';
import {
  MoveGoalsForWeekProvider,
  useMoveGoalsForWeekContext,
} from '@/hooks/useMoveGoalsForWeekContext';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
  weekData: WeekData;
  year: number;
  quarter: number;
}

// Inner component that uses the context
const WeekCardInner = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek,
  children,
  weekData,
}: Omit<WeekCardProps, 'year' | 'quarter'>) => {
  const { isFirstWeek, isDisabled, isMovingTasks, handlePreviewTasks, dialog } =
    useMoveGoalsForWeekContext();

  const tooltipContent = isFirstWeek
    ? 'Cannot pull goals from previous week as this is the first week of the quarter'
    : isMovingTasks
    ? 'Moving tasks...'
    : "Can't pull from previous week";

  // Memoize the WeekActionMenu props to prevent unnecessary re-renders
  const weekActionMenuProps = useMemo(
    () => ({
      isDisabled,
      isFirstWeek,
      isMovingTasks,
      handlePreviewTasks,
      tooltipContent,
      buttonSize: 'icon' as const,
      showLabel: false,
    }),
    [isDisabled, isFirstWeek, isMovingTasks, handlePreviewTasks, tooltipContent]
  );

  return (
    <WeekProviderWithoutDashboard weekData={weekData}>
      <div
        className={cn(
          'h-full flex flex-col border rounded-lg shadow bg-white',
          isCurrentWeek && 'ring-2 ring-blue-500'
        )}
      >
        <div
          className={cn(
            'border-b p-2 md:p-3 flex-shrink-0',
            isCurrentWeek && 'bg-blue-50'
          )}
        >
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
              <h3 className="font-semibold">{weekLabel}</h3>
              <span className="text-xs md:text-sm text-gray-500">
                {mondayDate}
              </span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <WeekActionMenu {...weekActionMenuProps} />
            </div>
          </div>
        </div>
        <div className="flex-1 p-2 md:p-3 space-y-3 md:space-y-4 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>

      {dialog}
    </WeekProviderWithoutDashboard>
  );
};

// Outer component that provides the context
export const WeekCard = (props: WeekCardProps) => {
  const { weekNumber, year, quarter, ...rest } = props;

  return (
    <MoveGoalsForWeekProvider
      weekNumber={weekNumber}
      year={year}
      quarter={quarter}
    >
      <WeekCardInner weekNumber={weekNumber} {...rest} />
    </MoveGoalsForWeekProvider>
  );
};

WeekCard.displayName = 'WeekCard';
