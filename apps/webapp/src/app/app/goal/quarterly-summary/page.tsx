'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { 
  MultiQuarterlyGoalSummaryView, 
  MultiQuarterlySummaryMarkdownView,
  QuarterlyGoalSelector 
} from '@/components/molecules/quarterly-summary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, FileText, Eye, Settings } from 'lucide-react';
import { useMultipleQuarterlyGoalsSummary } from '@/hooks/useMultipleQuarterlyGoalsSummary';
import { useSummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { DateTime } from 'luxon';

/**
 * Renders the multi-goal quarterly summary page.
 * This page displays a combined view of multiple quarterly goals, including their associated weekly and daily goals,
 * and provides navigation options and goal selection.
 *
 * @returns {JSX.Element} The rendered multi-goal quarterly summary page.
 */
export default function MultiGoalQuarterlySummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'summary' | 'markdown' | 'selection'>('selection');
  
  // Get year and quarter from URL params, fallback to current date
  const { year, quarter } = React.useMemo(() => {
    const now = DateTime.now();
    const yearParam = searchParams.get('year');
    const quarterParam = searchParams.get('quarter');
    
    const year = yearParam ? parseInt(yearParam) : now.year;
    const quarter = quarterParam ? (parseInt(quarterParam) as 1 | 2 | 3 | 4) : (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);
    return { year, quarter };
  }, [searchParams]);
  
  // Get selected goal IDs from URL params
  const [selectedGoalIds, setSelectedGoalIds] = React.useState<Id<'goals'>[]>(() => {
    const goalsParam = searchParams.get('goals');
    if (goalsParam) {
      return goalsParam.split(',') as Id<'goals'>[];
    }
    return [];
  });
  
  const goalActions = useSummaryGoalActions();
  
  // Get the multi-goal summary data
  const { summaryData } = useMultipleQuarterlyGoalsSummary({
    quarterlyGoalIds: selectedGoalIds,
    year,
    quarter,
  });

  // Update URL when selection changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', year.toString());
    params.set('quarter', quarter.toString());
    if (selectedGoalIds.length > 0) {
      params.set('goals', selectedGoalIds.join(','));
    }
    
    const newUrl = `/app/goal/quarterly-summary?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedGoalIds, year, quarter]);

  // Set page title
  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = `Q${quarter} ${year} Multi-Goal Summary`;
    
    return () => {
      document.title = originalTitle;
    };
  }, [quarter, year]);

  const handleGoBack = React.useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/app/dashboard');
    }
  }, [router]);

  const handleGoHome = React.useCallback(() => {
    router.push('/app/dashboard');
  }, [router]);

  const handleSelectionChange = React.useCallback((goalIds: Id<'goals'>[]) => {
    setSelectedGoalIds(goalIds);
    // Auto-switch to summary view if goals are selected and we're in selection mode
    if (goalIds.length > 0 && viewMode === 'selection') {
      setViewMode('summary');
    }
  }, [viewMode]);

  const canShowSummary = selectedGoalIds.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoHome}
                  className="flex items-center gap-1 h-8 px-2"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Button>
                <span>/</span>
                <span>Multi-Goal Summary</span>
                <span>/</span>
                <span className="font-medium text-foreground">
                  Q{quarter} {year}
                </span>
              </div>
            </div>

            {/* View Toggle and Quarter Badge */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'selection' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('selection')}
                  className="h-8 px-3"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Select Goals
                </Button>
                <Button
                  variant={viewMode === 'summary' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('summary')}
                  disabled={!canShowSummary}
                  className="h-8 px-3"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Summary
                </Button>
                <Button
                  variant={viewMode === 'markdown' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('markdown')}
                  disabled={!canShowSummary}
                  className="h-8 px-3"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Markdown
                </Button>
              </div>
              
              {/* Quarter Badge */}
              <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                Q{quarter} {year}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'selection' && (
          <QuarterlyGoalSelector
            year={year}
            quarter={quarter}
            selectedGoalIds={selectedGoalIds}
            onSelectionChange={handleSelectionChange}
            className="bg-white rounded-lg shadow-sm border p-6"
          />
        )}
        
        {viewMode === 'summary' && canShowSummary && (
          <MultiQuarterlyGoalSummaryView
            quarterlyGoalIds={selectedGoalIds}
            year={year}
            quarter={quarter}
            goalActions={goalActions}
            className="bg-white rounded-lg shadow-sm border p-6"
          />
        )}
        
        {viewMode === 'markdown' && canShowSummary && summaryData && (
          <MultiQuarterlySummaryMarkdownView
            summaryData={summaryData}
            className="shadow-sm border"
          />
        )}
        
        {!canShowSummary && viewMode !== 'selection' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <p className="text-muted-foreground mb-4">
              No goals selected. Please select goals to view the summary.
            </p>
            <Button onClick={() => setViewMode('selection')}>
              Select Goals
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 