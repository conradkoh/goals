'use client';

import { DashboardFocusView } from '@/components/organisms/DashboardFocusView';
import { useDashboard } from '@/hooks/useDashboard';

/**
 * Main dashboard page displaying goals in quarterly, weekly, or daily views.
 */
const DashboardPage = () => {
  const {
    selectedWeek,
    selectedDayOfWeek,
    viewMode,
    handleViewModeChange,
    handleYearQuarterChange,
    handlePrevious,
    handleNext,
  } = useDashboard();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <DashboardFocusView
          viewMode={viewMode}
          selectedWeekNumber={selectedWeek}
          selectedDayOfWeek={selectedDayOfWeek}
          onViewModeChange={handleViewModeChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onYearQuarterChange={handleYearQuarterChange}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
