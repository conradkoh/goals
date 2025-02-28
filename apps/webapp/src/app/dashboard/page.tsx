'use client';
import React, { useCallback } from 'react';
import { DashboardFocusView } from '../../components/organisms/DashboardFocusView';
import { ViewMode } from '@/app/focus/page.constants';
import { useSearchParams, useRouter } from 'next/navigation';
import { YearQuarterSelector } from '@/components/organisms/quarterly-overview/YearQuarterSelector';

const QuarterOverviewPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get view mode from URL or use default
  const viewMode = (searchParams.get('viewMode') as ViewMode) || 'quarterly';

  // Update URL when view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      // Update URL with new view mode
      const params = new URLSearchParams(searchParams);
      params.set('viewMode', newViewMode);
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col min-h-screen w-full pt-2 sm:pt-4 h-full">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 mb-2">
        <div className="flex flex-wrap justify-center items-center gap-4">
          <YearQuarterSelector
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>
      </div>
      <div
        id="db-focus-view-container"
        className="flex-grow w-full h-[calc(100vh-120px)] overflow-hidden"
      >
        <DashboardFocusView
          initialViewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>
    </div>
  );
};

export default QuarterOverviewPage;
