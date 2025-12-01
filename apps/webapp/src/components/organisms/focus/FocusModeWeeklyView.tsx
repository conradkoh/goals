import type { DayOfWeek } from '@services/backend/src/constants';
import { useMemo } from 'react';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { WeekActionMenu } from '@/components/molecules/week/WeekActionMenu';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import {
  MoveGoalsForWeekProvider,
  useMoveGoalsForWeekContext,
} from '@/hooks/useMoveGoalsForWeekContext';
import { type WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../WeekCardWeeklyGoals';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: WeekData;
  onJumpToToday: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

// Inner component that uses the context
const FocusModeWeeklyViewInner = ({
  weekNumber,
  year,
  quarter,
  weekData,
  onJumpToToday,
}: FocusModeWeeklyViewProps) => {
  const { isFirstWeek, isDisabled, isMovingTasks, handlePreviewTasks, dialog } =
    useMoveGoalsForWeekContext();
  const { weekday: currentDay } = useCurrentWeekInfo();

  // Memoize the WeekActionMenu props
  const weekActionMenuProps = useMemo(
    () => ({
      isDisabled,
      isFirstWeek,
      isMovingTasks,
      handlePreviewTasks,
      buttonSize: 'icon' as const,
      showLabel: false,
    }),
    [isDisabled, isFirstWeek, isMovingTasks, handlePreviewTasks]
  );

  // Memoize the conditional rendering of WeekActionMenu
  const weekActionMenu = useMemo(
    () => !isFirstWeek && <WeekActionMenu {...weekActionMenuProps} />,
    [isFirstWeek, weekActionMenuProps]
  );

  // Memoize the components to prevent unnecessary re-renders
  const quarterlyGoalsComponent = useMemo(
    () => <WeekCardQuarterlyGoals weekNumber={weekNumber} year={year} quarter={quarter} />,
    [weekNumber, year, quarter]
  );

  const weeklyGoalsComponent = useMemo(
    () => <WeekCardWeeklyGoals weekNumber={weekNumber} year={year} quarter={quarter} />,
    [weekNumber, year, quarter]
  );

  const dailyGoalsComponent = useMemo(
    () => <WeekCardDailyGoals weekNumber={weekNumber} year={year} mode="plan" />,
    [weekNumber, year]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-semibold text-foreground">💭 Quarterly Goals</div>
          <div className="flex items-center gap-2">
            <JumpToCurrentButton
              year={year}
              quarter={quarter}
              selectedWeek={weekNumber}
              selectedDay={currentDay}
              onJumpToToday={onJumpToToday}
            />
            {weekActionMenu}
          </div>
        </div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {quarterlyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">🚀 Weekly Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {weeklyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">📋 Adhoc Tasks</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <AdhocGoalsSection weekNumber={weekNumber} showHeader={false} variant="inline" />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">🔍 Daily Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {dailyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      {dialog}
    </div>
  );
};

// Outer component that provides the context
export const FocusModeWeeklyView = (props: FocusModeWeeklyViewProps) => {
  const { weekNumber, year, quarter, weekData, onJumpToToday } = props;

  return (
    <MoveGoalsForWeekProvider weekNumber={weekNumber} year={year} quarter={quarter}>
      <FocusModeWeeklyViewInner
        weekNumber={weekNumber}
        year={year}
        quarter={quarter}
        weekData={weekData}
        onJumpToToday={onJumpToToday}
      />
    </MoveGoalsForWeekProvider>
  );
};
