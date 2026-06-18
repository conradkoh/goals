import { CalendarDays, ClipboardList, Rocket, Target } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { WeekCardDailyGoals } from '../WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../WeekCardWeeklyGoals';

import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { type WeekData, WeekProvider } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: WeekData;
  onJumpToToday: (year: number, quarter: number, weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

/** Props for the inner component - excludes weekData since it uses context */
type FocusModeWeeklyViewInnerProps = Omit<FocusModeWeeklyViewProps, 'weekData'>;

const SectionHeader = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="flex items-center gap-2 font-semibold text-foreground">
    <span className="text-muted-foreground">{icon}</span>
    <span>{title}</span>
  </div>
);

// Inner component that uses the week context
// Gets goal data from useWeek() context which includes optimistic updates
const FocusModeWeeklyViewInner = ({
  weekNumber,
  year,
  quarter,
  onJumpToToday,
}: FocusModeWeeklyViewInnerProps) => {
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
      <div className="bg-card rounded-lg border border-border shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <SectionHeader icon={<Target className="h-4 w-4" />} title="Quarterly Goals" />
          <JumpToCurrentButton onJumpToToday={onJumpToToday} />
        </div>
        {quarterlyGoalsComponent}
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-4">
        <SectionHeader icon={<Rocket className="h-4 w-4" />} title="Weekly Goals" />
        <div className="mb-4" />
        {weeklyGoalsComponent}
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-4">
        <SectionHeader icon={<ClipboardList className="h-4 w-4" />} title="Adhoc Tasks" />
        <div className="mb-4" />
        <AdhocGoalsSection
          year={year}
          weekNumber={weekNumber}
          showHeader={false}
          variant="inline"
        />
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-4">
        <SectionHeader icon={<CalendarDays className="h-4 w-4" />} title="Daily Goals" />
        <div className="mb-4" />
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
