import React, { useState, useCallback, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { ViewMode } from '@/app/focus/page.constants';
import { useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';

interface DashboardFocusViewProps {
  initialViewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

export const DashboardFocusView: React.FC<DashboardFocusViewProps> = ({
  initialViewMode = 'quarterly',
  onViewModeChange,
}) => {
  const { selectedYear, selectedQuarter, currentWeekNumber } = useDashboard();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedWeekNumber, setSelectedWeekNumber] =
    useState<number>(currentWeekNumber);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(
    DayOfWeek.MONDAY
  );

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

  return (
    <div className="flex flex-col w-full max-w-screen-2xl mx-auto">
      <div className="w-full">
        {viewMode === 'quarterly' && (
          <FocusModeQuarterlyView
            year={selectedYear}
            quarter={selectedQuarter}
          />
        )}

        {viewMode === 'weekly' && weekData && (
          <FocusModeWeeklyView
            weekNumber={selectedWeekNumber}
            year={selectedYear}
            quarter={selectedQuarter}
            weekData={weekData}
            onNavigate={handleWeekNavigation}
          />
        )}

        {viewMode === 'daily' && weekData && (
          <FocusModeDailyView
            weekNumber={selectedWeekNumber}
            year={selectedYear}
            quarter={selectedQuarter}
            weekData={weekData}
            selectedDayOfWeek={selectedDayOfWeek}
            onNavigate={handleDayNavigation}
          />
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
