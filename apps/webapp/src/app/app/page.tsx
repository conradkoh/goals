'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { DashboardFocusView } from '@/components/organisms/DashboardFocusView';
import { useDashboard } from '@/hooks/useDashboard';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { buildMissingDashboardDefaults } from '@/lib/dashboard/dashboardUrlParams';

/**
 * Main dashboard page displaying goals in quarterly, weekly, or daily views.
 */
const DashboardPage = () => {
  const searchParams = useSearchParams();
  const { isMobile } = useDeviceScreenInfo();
  const {
    currentWeekNumber,
    selectedWeek,
    selectedDayOfWeek,
    viewMode,
    currentYear,
    currentQuarter,
    handleViewModeChange,
    handleYearQuarterChange,
    handlePrevious,
    handleNext,
    updateUrlParams,
  } = useDashboard();

  // Persist canonical defaults when first loading the page without navigation params.
  useEffect(() => {
    const missingDefaults = buildMissingDashboardDefaults(
      searchParams,
      viewMode,
      {
        year: currentYear,
        quarter: currentQuarter,
        week: currentWeekNumber,
        day: selectedDayOfWeek,
      },
      isMobile
    );

    if (missingDefaults) {
      updateUrlParams(missingDefaults);
    }
  }, [
    isMobile,
    searchParams,
    viewMode,
    currentWeekNumber,
    selectedDayOfWeek,
    currentYear,
    currentQuarter,
    updateUrlParams,
  ]);

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
