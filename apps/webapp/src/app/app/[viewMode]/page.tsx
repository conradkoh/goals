'use client';

import { notFound, useParams } from 'next/navigation';

import { DashboardFocusView } from '@/components/organisms/DashboardFocusView';
import { useDashboard } from '@/hooks/useDashboard';
import { isViewMode } from '@/lib/dashboard/dashboardUrlParams';

const DashboardViewPage = () => {
  const params = useParams();
  const {
    selectedWeek,
    selectedDayOfWeek,
    viewMode,
    handleViewModeChange,
    handleYearQuarterChange,
    handlePrevious,
    handleNext,
  } = useDashboard();

  const viewModeParam = params.viewMode;
  if (typeof viewModeParam !== 'string' || !isViewMode(viewModeParam)) {
    notFound();
  }

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

export default DashboardViewPage;
