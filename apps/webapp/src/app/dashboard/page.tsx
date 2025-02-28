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
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="bg-background p-3 border-b">
        <div className="max-w-screen-2xl mx-auto px-4 flex justify-center">
          <YearQuarterSelector
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>
      </div>

      {/* Main Content - always shows scrollbars */}
      <div
        className="flex-1 overflow-auto"
        style={{
          overflow: 'scroll',
          scrollbarWidth: 'auto',
          msOverflowStyle: 'scrollbar',
        }}
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
