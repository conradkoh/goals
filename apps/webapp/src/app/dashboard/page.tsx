'use client';
import React, { useCallback } from 'react';
import { DashboardFocusView } from '../../components/organisms/DashboardFocusView';
import { ViewMode } from '@/app/focus/page.constants';
import { useSearchParams, useRouter } from 'next/navigation';

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
