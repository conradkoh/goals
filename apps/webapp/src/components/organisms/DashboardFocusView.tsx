import React, { useState, useCallback, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { ViewMode } from '@/app/focus/page.constants';
import { useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { FocusMenuBar } from '@/app/focus/components/FocusMenuBar';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';

interface DashboardFocusViewProps {
  initialViewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

export const DashboardFocusView: React.FC<DashboardFocusViewProps> = ({
  initialViewMode = 'quarterly',
  onViewModeChange,
}) => {
  const { selectedYear, selectedQuarter, currentWeekNumber } = useDashboard();
  // Call hooks at the top level
  const currentDateTime = useCurrentDateTime();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedWeekNumber, setSelectedWeekNumber] =
    useState<number>(currentWeekNumber);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(
    currentDateTime.weekday as DayOfWeek
  );

  // Get quarter week info for navigation bounds
  const { startWeek, endWeek } = useQuarterWeekInfo(
    selectedYear,
    selectedQuarter
  );

  // Calculate navigation bounds
  const isAtMinBound =
    viewMode === 'daily'
      ? selectedWeekNumber === startWeek &&
        selectedDayOfWeek === DayOfWeek.MONDAY
      : selectedWeekNumber === startWeek;
  const isAtMaxBound =
    viewMode === 'daily'
      ? selectedWeekNumber === endWeek && selectedDayOfWeek === DayOfWeek.SUNDAY
      : selectedWeekNumber === endWeek;

  // Fetch week data for the selected week
  const weekData = useWeekWithoutDashboard({
    year: selectedYear,
    quarter: selectedQuarter,
    week: selectedWeekNumber,
  });

  // Update local state when initialViewMode prop changes
  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      setViewMode(newViewMode);
      if (onViewModeChange) {
        onViewModeChange(newViewMode);
      }
    },
    [onViewModeChange]
  );

  const handleWeekNavigation = useCallback((weekNumber: number) => {
    setSelectedWeekNumber(weekNumber);
  }, []);

  const handleDayNavigation = useCallback(
    (weekNumber: number, dayOfWeek: DayOfWeek) => {
      setSelectedWeekNumber(weekNumber);
      setSelectedDayOfWeek(dayOfWeek);
    },
    []
  );

  const handlePrevious = useCallback(() => {
    if (isAtMinBound) return;

    if (viewMode === 'weekly') {
      const newWeek = selectedWeekNumber - 1;
      setSelectedWeekNumber(newWeek);
      return;
    }

    if (selectedDayOfWeek === DayOfWeek.MONDAY) {
      // If we're on Monday and not at min week, go to previous week's Sunday
      const newWeek = selectedWeekNumber - 1;
      setSelectedWeekNumber(newWeek);
      setSelectedDayOfWeek(DayOfWeek.SUNDAY);
    } else {
      // Otherwise just go to previous day
      const newDay = (selectedDayOfWeek - 1) as DayOfWeek;
      setSelectedDayOfWeek(newDay);
    }
  }, [isAtMinBound, viewMode, selectedWeekNumber, selectedDayOfWeek]);

  const handleNext = useCallback(() => {
    if (isAtMaxBound) return;

    if (viewMode === 'weekly') {
      const newWeek = selectedWeekNumber + 1;
      setSelectedWeekNumber(newWeek);
      return;
    }

    if (selectedDayOfWeek === DayOfWeek.SUNDAY) {
      // If we're on Sunday and not at max week, go to next week's Monday
      const newWeek = selectedWeekNumber + 1;
      setSelectedWeekNumber(newWeek);
      setSelectedDayOfWeek(DayOfWeek.MONDAY);
    } else {
      // Otherwise just go to next day
      const newDay = (selectedDayOfWeek + 1) as DayOfWeek;
      setSelectedDayOfWeek(newDay);
    }
  }, [isAtMaxBound, viewMode, selectedWeekNumber, selectedDayOfWeek]);

  return (
    <div id="db-focus-view" className="w-full h-full">
      <div className="w-full mb-4">
        <FocusMenuBar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          selectedWeek={selectedWeekNumber}
          selectedDay={selectedDayOfWeek}
          isAtMinBound={isAtMinBound}
          isAtMaxBound={isAtMaxBound}
          onPrevious={handlePrevious}
          onNext={handleNext}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
        />
      </div>
      <div className="w-full h-full">
        {viewMode === 'quarterly' && (
          <FocusModeQuarterlyView
            year={selectedYear}
            quarter={selectedQuarter}
          />
        )}

        {viewMode === 'weekly' && weekData && (
          <div className="w-full h-full md:max-w-4xl mx-auto">
            <FocusModeWeeklyView
              weekNumber={selectedWeekNumber}
              year={selectedYear}
              quarter={selectedQuarter}
              weekData={weekData}
              onNavigate={handleWeekNavigation}
            />
          </div>
        )}

        {viewMode === 'daily' && weekData && (
          <div className="w-full h-full md:max-w-4xl mx-auto">
            <FocusModeDailyView
              weekNumber={selectedWeekNumber}
              year={selectedYear}
              quarter={selectedQuarter}
              weekData={weekData}
              selectedDayOfWeek={selectedDayOfWeek}
              onNavigate={handleDayNavigation}
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
