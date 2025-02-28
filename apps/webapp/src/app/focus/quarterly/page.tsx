'use client';

import React, { useCallback, useMemo, memo } from 'react';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewMode } from '@/app/focus/page.constants';
import { FocusHeader } from '../components/FocusHeader';

const QuarterlyFocusPage = memo(() => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get the year and quarter from the URL or use the current year and quarter
  const currentDate = new Date();

  const { year, quarter } = useMemo(() => {
    return {
      year: parseInt(
        searchParams.get('year') || currentDate.getFullYear().toString(),
        10
      ),
      quarter: parseInt(
        searchParams.get('quarter') ||
          (Math.floor(currentDate.getMonth() / 3) + 1).toString(),
        10
      ),
    };
  }, [searchParams, currentDate]);

  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      if (newViewMode === 'quarterly') return; // Already on quarterly view

      // Navigate to the appropriate focus view
      router.push(`/focus?year=${year}&quarter=${quarter}&view=${newViewMode}`);
    },
    [router, year, quarter]
  );

  const handleClose = useCallback(() => {
    router.push(`/dashboard?year=${year}&quarter=${quarter}`);
  }, [router, year, quarter]);

  return (
    <div className="min-h-screen w-screen bg-gray-50 overflow-clip">
      {/* Top Bar */}
      <FocusHeader
        viewMode="quarterly"
        onViewModeChange={handleViewModeChange}
        onClose={handleClose}
      />

      {/* Content - Full width for quarterly view */}
      <div className="w-full py-8">
        <FocusModeQuarterlyView year={year} quarter={quarter} />
      </div>
    </div>
  );
});

QuarterlyFocusPage.displayName = 'QuarterlyFocusPage';

export default QuarterlyFocusPage;
