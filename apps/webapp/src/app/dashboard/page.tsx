'use client';
import React, { useEffect } from 'react';
import { DashboardFocusView } from '../../components/organisms/DashboardFocusView';
import { useDashboard } from '@/hooks/useDashboard';
import { useSearchParams } from 'next/navigation';
import { useScreenSize } from '@/hooks/useScreenSize';

const QuarterOverviewPage = () => {
  const searchParams = useSearchParams();
  const { isMobile } = useScreenSize();
  const {
    selectedYear,
    selectedQuarter,
    currentWeekNumber,
    selectedWeek,
    selectedDayOfWeek,
    viewMode,
    isAtMinBound,
    isAtMaxBound,
    handleViewModeChange,
    handleYearQuarterChange,
    handlePrevious,
    handleNext,
    updateUrlParams,
  } = useDashboard();

  // Set default parameters when first loading the page
  useEffect(() => {
    const params: Record<string, string> = {};
    let shouldUpdateUrl = false;

    // Set default view mode if not present
    if (!searchParams.get('viewMode')) {
      params.viewMode = isMobile ? 'weekly' : 'quarterly';
      shouldUpdateUrl = true;
    }

    // Set default week if in weekly/daily mode and week not set
    if (
      (viewMode === 'weekly' || viewMode === 'daily') &&
      !searchParams.get('week')
    ) {
      params.week = currentWeekNumber.toString();
      shouldUpdateUrl = true;
    }

    // Set default day if in daily mode and day not set
    if (viewMode === 'daily' && !searchParams.get('day')) {
      params.day = selectedDayOfWeek.toString();
      shouldUpdateUrl = true;
    }

    if (shouldUpdateUrl) {
      updateUrlParams(params);
    }
  }, [
    isMobile,
    searchParams,
    viewMode,
    currentWeekNumber,
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <DashboardFocusView
          viewMode={viewMode}
          selectedWeekNumber={selectedWeek}
          selectedDayOfWeek={selectedDayOfWeek}
          isAtMinBound={isAtMinBound}
          isAtMaxBound={isAtMaxBound}
          onViewModeChange={handleViewModeChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onYearQuarterChange={handleYearQuarterChange}
        />
      </div>
    </div>
  );
};

export default QuarterOverviewPage;
