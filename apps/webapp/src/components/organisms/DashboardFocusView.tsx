import React, { useMemo } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { ViewMode } from '@/app/focus/page.constants';
import { useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { FocusMenuBar } from '@/app/focus/components/FocusMenuBar';

interface DashboardFocusViewProps {
  viewMode: ViewMode;
  selectedWeekNumber: number;
  selectedDayOfWeek: DayOfWeek;
  isAtMinBound: boolean;
  isAtMaxBound: boolean;
  onViewModeChange: (viewMode: ViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onYearQuarterChange?: (year: number, quarter: number) => void;
}

export const DashboardFocusView: React.FC<DashboardFocusViewProps> = ({
  viewMode,
  selectedWeekNumber,
  selectedDayOfWeek,
  isAtMinBound,
  isAtMaxBound,
  onViewModeChange,
  onPrevious,
  onNext,
  onYearQuarterChange,
}) => {
  const { selectedYear, selectedQuarter } = useDashboard();

  // Force component re-render when year/quarter changes
  const [forceRender, setForceRender] = React.useState(0);

  // Fetch week data for the selected week
  const weekData = useWeekWithoutDashboard({
    year: selectedYear,
    quarter: selectedQuarter,
    week: selectedWeekNumber,
  });

  // When year or quarter changes, force a re-render
  React.useEffect(() => {
    setForceRender((prev) => prev + 1);
  }, [selectedYear, selectedQuarter]);

  // Create unique keys for view components to force re-renders when year/quarter change
  const quarterlyViewKey = useMemo(
    () => `quarterly-${selectedYear}-${selectedQuarter}-${forceRender}`,
    [selectedYear, selectedQuarter, forceRender]
  );

  const weeklyViewKey = useMemo(
    () =>
      `weekly-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${forceRender}`,
    [selectedYear, selectedQuarter, selectedWeekNumber, forceRender]
  );

  const dailyViewKey = useMemo(
    () =>
      `daily-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${selectedDayOfWeek}-${forceRender}`,
    [
      selectedYear,
      selectedQuarter,
      selectedWeekNumber,
      selectedDayOfWeek,
      forceRender,
    ]
  );

  return (
    <div id="db-focus-view" className="w-full h-full">
      <div className="w-full">
        <FocusMenuBar
          viewMode={viewMode}
          selectedWeek={selectedWeekNumber}
          selectedDay={selectedDayOfWeek}
          isAtMinBound={isAtMinBound}
          isAtMaxBound={isAtMaxBound}
          onPrevious={onPrevious}
          onNext={onNext}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onViewModeChange={onViewModeChange}
          onYearQuarterChange={onYearQuarterChange}
        />
      </div>
      <div className="w-full h-full">
        {viewMode === 'quarterly' && (
          <div key={quarterlyViewKey}>
            <FocusModeQuarterlyView
              year={selectedYear}
              quarter={selectedQuarter}
            />
          </div>
        )}

        {viewMode === 'weekly' && weekData && (
          <div
            className="w-full h-full md:max-w-4xl mx-auto"
            key={weeklyViewKey}
          >
            <FocusModeWeeklyView
              weekNumber={selectedWeekNumber}
              year={selectedYear}
              quarter={selectedQuarter}
              weekData={weekData}
            />
          </div>
        )}

        {viewMode === 'daily' && weekData && (
          <div
            className="w-full h-full md:max-w-4xl mx-auto"
            key={dailyViewKey}
          >
            <FocusModeDailyView
              weekNumber={selectedWeekNumber}
              year={selectedYear}
              quarter={selectedQuarter}
              weekData={weekData}
              selectedDayOfWeek={selectedDayOfWeek}
            />
          </div>
        )}

        {(viewMode === 'weekly' || viewMode === 'daily') && !weekData && (
          <div className="p-8 text-center bg-white rounded-lg shadow-sm">
            <p className="text-muted-foreground">Loading week data...</p>
          </div>
        )}
      </div>
    </div>
  );
};
