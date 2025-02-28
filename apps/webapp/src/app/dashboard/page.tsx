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
    <div className="min-h-screen w-full pt-4 sm:pt-6 h-full overflow-auto">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex flex-wrap justify-center items-center gap-4">
          <YearQuarterSelector
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>
      </div>

      <DashboardFocusView
        initialViewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </div>
  );
};

export default QuarterOverviewPage;
