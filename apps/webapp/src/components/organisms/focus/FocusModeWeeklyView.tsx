import type { DayOfWeek } from '@services/backend/src/constants';
import { useMemo } from 'react';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { PullGoalsButton } from '@/components/molecules/PullGoalsButton';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { usePullGoals } from '@/hooks/usePullGoals';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { type WeekData, WeekProvider } from '@/hooks/useWeek';
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

/** Props for the inner component - excludes weekData since it uses context */
type FocusModeWeeklyViewInnerProps = Omit<FocusModeWeeklyViewProps, 'weekData'>;

// Inner component that uses the week context
// Gets goal data from useWeek() context which includes optimistic updates
const FocusModeWeeklyViewInner = ({
  weekNumber,
  year,
  quarter,
  onJumpToToday,
}: FocusModeWeeklyViewInnerProps) => {
  const { weekday: currentDay } = useCurrentWeekInfo();
  const { currentWeekNumber } = useQuarterWeekInfo(year, quarter as 1 | 2 | 3 | 4);

  // Only show pull goals button when viewing the current week
  const isCurrentWeek = weekNumber === currentWeekNumber;

  // Pull goals hook
  const {
    isPulling,
    handlePullGoals,
    dialog: pullGoalsDialog,
  } = usePullGoals({
    weekNumber,
    year,
    quarter,
  });

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
            {isCurrentWeek && (
              <PullGoalsButton
                isPulling={isPulling}
                onPullGoals={handlePullGoals}
                dialog={pullGoalsDialog}
              />
            )}
            <JumpToCurrentButton
              year={year}
              quarter={quarter}
              selectedWeek={weekNumber}
              selectedDay={currentDay}
              onJumpToToday={onJumpToToday}
            />
          </div>
        </div>
        {quarterlyGoalsComponent}
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">🚀 Weekly Goals</div>
        {weeklyGoalsComponent}
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">📋 Adhoc Tasks</div>
        <AdhocGoalsSection weekNumber={weekNumber} showHeader={false} variant="inline" />
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4">
        <div className="font-semibold text-foreground mb-4">🔍 Daily Goals</div>
        {dailyGoalsComponent}
      </div>
    </div>
  );
};

// Outer component that provides the SINGLE week context for all sections
export const FocusModeWeeklyView = ({ weekData, ...innerProps }: FocusModeWeeklyViewProps) => {
  return (
    <WeekProvider weekData={weekData}>
      <FocusModeWeeklyViewInner {...innerProps} />
    </WeekProvider>
  );
};
