'use client';

import type { Id } from '@services/backend/convex/_generated/dataModel';
import { ArrowLeft, Eye, FileText, Home, Settings } from 'lucide-react';
import { DateTime } from 'luxon';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import {
  AdhocDomainSelector,
  MultiQuarterlySummaryMarkdownView,
  QuarterlyGoalSelector,
  QuarterSummaryResults,
} from '@/components/molecules/quarterly-summary';
import { Button } from '@/components/ui/button';
import { useDomains } from '@/hooks/useDomains';
import { useQuarterSummary } from '@/hooks/useQuarterSummary';
import { useSummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { useSession } from '@/modules/auth/useSession';

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

    const year = yearParam ? Number.parseInt(yearParam) : now.year;
    const quarter = quarterParam
      ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
      : (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);
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

  const { sessionId } = useSession();
  const { domains } = useDomains(sessionId);

  // Get selected adhoc domain IDs from URL params
  const [selectedAdhocDomainIds, setSelectedAdhocDomainIds] = React.useState<Id<'domains'>[]>(
    () => {
      const domainsParam = searchParams.get('adhocDomains');
      if (domainsParam) {
        return domainsParam.split(',') as Id<'domains'>[];
      }
      return [];
    }
  );

  const goalActions = useSummaryGoalActions();

  // Derived state: include adhoc goals if any domains are selected
  const includeAdhocGoals = selectedAdhocDomainIds.length > 0;

  // Get the multi-goal summary data
  const { summaryData } = useQuarterSummary({
    quarterlyGoalIds: selectedGoalIds,
    year,
    quarter,
    includeAdhocGoals,
    adhocDomainIds: selectedAdhocDomainIds,
  });

  // Update URL when selection changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', year.toString());
    params.set('quarter', quarter.toString());
    if (selectedGoalIds.length > 0) {
      params.set('goals', selectedGoalIds.join(','));
    }
    if (selectedAdhocDomainIds.length > 0) {
      params.set('adhocDomains', selectedAdhocDomainIds.join(','));
    }

    const newUrl = `/app/goal/quarterly-summary?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedGoalIds, selectedAdhocDomainIds, year, quarter]);

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
  }, []);

  const handleGenerateSummary = React.useCallback(() => {
    if (selectedGoalIds.length > 0 || includeAdhocGoals) {
      setViewMode('summary');
    }
  }, [selectedGoalIds, includeAdhocGoals]);

  const canShowSummary = selectedGoalIds.length > 0 || includeAdhocGoals;

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
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Create Report</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Select the goals you want to include in your quarterly summary.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-900">Quarterly Goals</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Strategic high-level goals for the quarter
                </p>
              </div>
              <div className="p-6">
                <QuarterlyGoalSelector
                  year={year}
                  quarter={quarter}
                  selectedGoalIds={selectedGoalIds}
                  onSelectionChange={handleSelectionChange}
                  onGenerateSummary={handleGenerateSummary}
                  showGenerateButton={false}
                  className="border-none shadow-none p-0"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Adhoc Goals</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tactical tasks and smaller wins - select domains to include
                  </p>
                </div>
              </div>

              <div className="p-6">
                {domains && domains.length > 0 ? (
                  <AdhocDomainSelector
                    domains={domains}
                    selectedDomainIds={selectedAdhocDomainIds}
                    onSelectionChange={setSelectedAdhocDomainIds}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No domains available. Adhoc goals are organized by domains.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 pb-12">
              <Button
                size="lg"
                onClick={handleGenerateSummary}
                className="w-full sm:w-auto text-lg h-12 px-8 shadow-lg hover:shadow-xl transition-all"
                disabled={!canShowSummary}
              >
                Generate Report
              </Button>
            </div>
          </div>
        )}

        {viewMode === 'summary' && canShowSummary && (
          <QuarterSummaryResults
            quarterlyGoalIds={selectedGoalIds}
            year={year}
            quarter={quarter}
            includeAdhocGoals={includeAdhocGoals}
            adhocDomainIds={selectedAdhocDomainIds}
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
            <Button onClick={() => setViewMode('selection')}>Select Goals</Button>
          </div>
        )}
      </div>
    </div>
  );
}
