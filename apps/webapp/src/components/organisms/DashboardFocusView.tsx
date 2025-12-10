import React, { useCallback, useMemo, useState } from 'react';
import type { ViewMode } from '@/components/molecules/focus/constants';
import { FocusMenuBar } from '@/components/molecules/focus/FocusMenuBar';
import { QuarterJumpDialog } from '@/components/molecules/focus/QuarterJumpDialog';
import { ViewModeKeyboardShortcuts } from '@/components/molecules/focus/ViewModeKeyboardShortcuts';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { GoalStatusProvider } from '@/contexts/GoalStatusContext';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { useDashboard } from '@/hooks/useDashboard';
import { useMoveGoalsForQuarter } from '@/hooks/useMoveGoalsForQuarter';
import { usePullGoals } from '@/hooks/usePullGoals';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { useWeekData } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';

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
  const { selectedYear, selectedQuarter, handleDayNavigation, isFocusModeEnabled } = useDashboard();
  const { currentWeekNumber } = useQuarterWeekInfo(selectedYear, selectedQuarter as 1 | 2 | 3 | 4);
  const { weekday: currentDay } = useCurrentWeekInfo();

  // State for quarter jump dialog (Cmd+K)
  const [isQuarterJumpOpen, setIsQuarterJumpOpen] = useState(false);

  // Use the hook for the "Pull from previous quarter" functionality
  const {
    isFirstQuarter,
    isMovingGoals,
    handlePreviewGoals,
    dialog: quarterMoveDialog,
  } = useMoveGoalsForQuarter({
    year: selectedYear,
    quarter: selectedQuarter as 1 | 2 | 3 | 4,
  });

  // Use the hook for "Pull goals" functionality for daily/weekly views
  const {
    isPulling: isPullingGoals,
    handlePullGoals,
    dialog: pullGoalsDialog,
  } = usePullGoals({
    weekNumber: selectedWeekNumber,
    year: selectedYear,
    quarter: selectedQuarter,
  });

  // Determine if pull goals should be shown based on current view
  // For daily view: only show when viewing today
  // For weekly view: only show when viewing current week
  const showPullGoals = useMemo(() => {
    if (viewMode === 'daily') {
      return selectedWeekNumber === currentWeekNumber && selectedDayOfWeek === currentDay;
    }
    if (viewMode === 'weekly') {
      return selectedWeekNumber === currentWeekNumber;
    }
    return false;
  }, [viewMode, selectedWeekNumber, currentWeekNumber, selectedDayOfWeek, currentDay]);

  // Force component re-render when year/quarter changes
  const [forceRender, setForceRender] = React.useState(0);

  // Fetch week data for the selected week
  const weekData = useWeekData({
    year: selectedYear,
    quarter: selectedQuarter,
    week: selectedWeekNumber,
  });

  // When year or quarter changes, force a re-render
  React.useEffect(() => {
    setForceRender((prev) => prev + 1);
  }, []);

  // Create unique keys for view components to force re-renders when year/quarter change
  const quarterlyViewKey = useMemo(
    () => `quarterly-${selectedYear}-${selectedQuarter}-${forceRender}`,
    [selectedYear, selectedQuarter, forceRender]
  );

  const weeklyViewKey = useMemo(
    () => `weekly-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${forceRender}`,
    [selectedYear, selectedQuarter, selectedWeekNumber, forceRender]
  );

  const dailyViewKey = useMemo(
    () =>
      `daily-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${selectedDayOfWeek}-${forceRender}`,
    [selectedYear, selectedQuarter, selectedWeekNumber, selectedDayOfWeek, forceRender]
  );

  // Unified callback for jumping to today - updates both week and day across all views
  const handleJumpToToday = useCallback(
    (weekNumber: number, dayOfWeek: DayOfWeek) => {
      handleDayNavigation(weekNumber, dayOfWeek);
    },
    [handleDayNavigation]
  );

  return (
    <GoalStatusProvider>
      <div id="db-focus-view" className="w-full h-full">
        <ViewModeKeyboardShortcuts
          onViewModeChange={onViewModeChange}
          onOpenQuarterJump={() => setIsQuarterJumpOpen(true)}
        />
        <QuarterJumpDialog
          open={isQuarterJumpOpen}
          onOpenChange={setIsQuarterJumpOpen}
          currentYear={selectedYear}
          currentQuarter={selectedQuarter}
          onQuarterSelect={(year, quarter) => {
            onYearQuarterChange?.(year, quarter);
          }}
        />
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
            // Pass props for QuarterActionMenu
            isFirstQuarter={isFirstQuarter}
            isMovingGoals={isMovingGoals}
            handlePreviewGoals={handlePreviewGoals}
            // Pass props for DailyWeeklyActionMenu
            isPullingGoals={isPullingGoals}
            showPullGoals={showPullGoals}
            onPullGoals={handlePullGoals}
            pullGoalsDialog={pullGoalsDialog}
          />
        </div>
        <div className="w-full h-full">
          {viewMode === 'quarterly' && (
            <div key={quarterlyViewKey}>
              <FocusModeQuarterlyView year={selectedYear} quarter={selectedQuarter} />
            </div>
          )}

          {viewMode === 'weekly' && weekData && (
            <div className="w-full h-full md:max-w-4xl mx-auto" key={weeklyViewKey}>
              <FocusModeWeeklyView
                weekNumber={selectedWeekNumber}
                year={selectedYear}
                quarter={selectedQuarter}
                weekData={weekData}
                onJumpToToday={handleJumpToToday}
              />
            </div>
          )}

          {viewMode === 'daily' && weekData && (
            <div className="w-full h-full md:max-w-4xl mx-auto" key={dailyViewKey}>
              <FocusModeDailyView
                weekNumber={selectedWeekNumber}
                year={selectedYear}
                quarter={selectedQuarter}
                weekData={weekData}
                selectedDayOfWeek={selectedDayOfWeek}
                onJumpToCurrent={handleJumpToToday}
                isFocusModeEnabled={isFocusModeEnabled}
              />
            </div>
          )}

          {(viewMode === 'weekly' || viewMode === 'daily') && !weekData && (
            <div className="p-8 text-center bg-white rounded-lg shadow-sm">
              <p className="text-muted-foreground">Loading week data...</p>
            </div>
          )}
        </div>

        {/* Render the quarter move dialog */}
        {quarterMoveDialog}
      </div>
    </GoalStatusProvider>
  );
};
