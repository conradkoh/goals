'use client';
import React, { useCallback, useEffect } from 'react';
import { DashboardFocusView } from '../../components/organisms/DashboardFocusView';
import { ViewMode } from '@/app/focus/page.constants';
import { useSearchParams, useRouter } from 'next/navigation';
import { useScreenSize } from '@/hooks/useScreenSize';
import { useDashboard } from '@/hooks/useDashboard';

const QuarterOverviewPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile } = useScreenSize();
  const { currentWeekNumber } = useDashboard();

  // Get view mode from URL or use default based on screen size
  const viewModeFromUrl = searchParams.get('viewMode') as ViewMode | null;
  const viewMode = viewModeFromUrl || (isMobile ? 'weekly' : 'quarterly');

  // Set default view mode based on screen size when first loading the page
  useEffect(() => {
    if (!viewModeFromUrl) {
      const params = new URLSearchParams(searchParams);
      params.set('viewMode', isMobile ? 'weekly' : 'quarterly');

      // If setting to weekly view, also set the current week
      if (isMobile && !params.has('week')) {
        params.set('week', currentWeekNumber.toString());
      }

      router.replace(`/dashboard?${params.toString()}`);
    }
  }, [isMobile, router, searchParams, viewModeFromUrl, currentWeekNumber]);

  // Update URL when view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      // Update URL with new view mode
      const params = new URLSearchParams(searchParams);
      params.set('viewMode', newViewMode);

      // If changing to weekly view, ensure week parameter is set
      if (newViewMode === 'weekly' && !params.has('week')) {
        params.set('week', currentWeekNumber.toString());
      }

      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams, currentWeekNumber]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <DashboardFocusView
          initialViewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>
    </div>
  );
};

export default QuarterOverviewPage;
