'use client';

import type { Id } from '@services/backend/convex/_generated/dataModel';
import { ArrowLeft, Eye, FileText, Home } from 'lucide-react';
import { DateTime } from 'luxon';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import {
  QuarterlyGoalSummaryView,
  QuarterlySummaryMarkdownView,
} from '@/components/molecules/quarterly-summary';
import { Button } from '@/components/ui/button';
import { useQuarterlyGoalSummary } from '@/hooks/useQuarterlyGoalSummary';
import { useSummaryGoalActions } from '@/hooks/useSummaryGoalActions';

/**
 * Renders the quarterly summary page for a specific goal.
 * This page displays a detailed view of a quarterly goal, including its associated weekly and daily goals,
 * and provides navigation options.
 *
 * @returns {JSX.Element} The rendered quarterly summary page.
 */
export default function QuarterlySummaryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'summary' | 'markdown'>('summary');

  // Get year and quarter from URL params, fallback to current date
  const { year, quarter } = React.useMemo(() => {
    const now = DateTime.now();
    const yearParam = searchParams.get('year');
    const quarterParam = searchParams.get('quarter');

    const year = yearParam ? Number.parseInt(yearParam) : now.year;
    const quarter = quarterParam
      ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
      : (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);
    return { year, quarter };
  }, [searchParams]);

  const goalId = params.goalId as Id<'goals'>;
  const goalActions = useSummaryGoalActions();

  // Get the quarterly goal data to show in breadcrumb
  const { summaryData } = useQuarterlyGoalSummary({
    quarterlyGoalId: goalId,
    year,
    quarter,
  });

  // Set page title based on goal name
  React.useEffect(() => {
    const originalTitle = document.title;

    if (summaryData?.quarterlyGoal.title) {
      document.title = `${summaryData.quarterlyGoal.title} - Q${quarter} ${year} Summary`;
    }

    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [summaryData?.quarterlyGoal.title, quarter, year]);

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
                <span>Quarterly Summary</span>
                {summaryData?.quarterlyGoal.title && (
                  <>
                    <span>/</span>
                    <span className="font-medium text-foreground truncate max-w-xs">
                      {summaryData.quarterlyGoal.title}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* View Toggle and Quarter Badge */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'summary' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('summary')}
                  className="h-8 px-3"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Summary
                </Button>
                <Button
                  variant={viewMode === 'markdown' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('markdown')}
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
        {viewMode === 'summary' ? (
          <QuarterlyGoalSummaryView
            quarterlyGoalId={goalId}
            year={year}
            quarter={quarter}
            goalActions={goalActions}
            className="bg-white rounded-lg shadow-sm border p-6"
          />
        ) : (
          summaryData && (
            <QuarterlySummaryMarkdownView summaryData={summaryData} className="shadow-sm border" />
          )
        )}
      </div>
    </div>
  );
}
