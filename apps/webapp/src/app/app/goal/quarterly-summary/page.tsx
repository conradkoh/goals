'use client';

import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, FileText, Home, Settings } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  // Get initial year and quarter from URL params, fallback to current date
  const initialYearQuarter = React.useMemo(() => {
    const now = DateTime.now();
    const yearParam = searchParams.get('year');
    const quarterParam = searchParams.get('quarter');

    const year = yearParam ? Number.parseInt(yearParam) : now.year;
    const quarter = quarterParam
      ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
      : (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);
    return { year, quarter };
  }, [searchParams]);

  // State for year and quarter (allows navigation)
  const [year, setYear] = React.useState(initialYearQuarter.year);
  const [quarter, setQuarter] = React.useState<1 | 2 | 3 | 4>(initialYearQuarter.quarter);

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

  // Get selected adhoc domain IDs from URL params (can include 'UNCATEGORIZED')
  const [selectedAdhocDomainIds, setSelectedAdhocDomainIds] = React.useState<
    (Id<'domains'> | 'UNCATEGORIZED')[]
  >(() => {
    const domainsParam = searchParams.get('adhocDomains');
    if (domainsParam) {
      return domainsParam.split(',') as (Id<'domains'> | 'UNCATEGORIZED')[];
    }
    return [];
  });

  const goalActions = useSummaryGoalActions();

  // Fetch adhoc goal counts per domain for the current quarter
  const adhocGoalCounts = useQuery(
    api.dashboard.getAdhocGoalCountsByDomainForQuarter,
    sessionId ? { sessionId, year, quarter } : 'skip'
  );

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

  // Reset selections when year/quarter changes
  const previousYearQuarterRef = React.useRef({ year, quarter });
  React.useEffect(() => {
    const prev = previousYearQuarterRef.current;
    if (prev.year !== year || prev.quarter !== quarter) {
      // Reset selections when navigating to a different quarter
      setSelectedGoalIds([]);
      setSelectedAdhocDomainIds([]);
      previousYearQuarterRef.current = { year, quarter };
    }
  }, [year, quarter]);

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

  // Year/Quarter navigation handlers
  const handlePreviousQuarter = React.useCallback(() => {
    if (quarter === 1) {
      setYear(year - 1);
      setQuarter(4);
    } else {
      setQuarter((quarter - 1) as 1 | 2 | 3 | 4);
    }
  }, [year, quarter]);

  const handleNextQuarter = React.useCallback(() => {
    if (quarter === 4) {
      setYear(year + 1);
      setQuarter(1);
    } else {
      setQuarter((quarter + 1) as 1 | 2 | 3 | 4);
    }
  }, [year, quarter]);

  const handleYearChange = React.useCallback((newYear: string) => {
    setYear(Number.parseInt(newYear));
  }, []);

  const handleQuarterChange = React.useCallback((newQuarter: string) => {
    setQuarter(Number.parseInt(newQuarter) as 1 | 2 | 3 | 4);
  }, []);

  // Generate year options (current year ± 5 years)
  const currentYear = DateTime.now().year;
  const yearOptions = React.useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const canShowSummary = selectedGoalIds.length > 0 || includeAdhocGoals;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b">
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
              <div className="flex items-center bg-muted rounded-lg p-1">
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'selection' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">Create Report</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Select the goals you want to include in your quarterly summary.
              </p>
            </div>

            {/* Year and Quarter Selector */}
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-muted/30">
                <h2 className="text-lg font-semibold text-foreground">Select Period</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the year and quarter for your report
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center gap-4">
                  {/* Previous Quarter Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousQuarter}
                    className="h-10 w-10"
                    title="Previous Quarter"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  {/* Year Selector */}
                  <Select value={year.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quarter Selector */}
                  <Select value={quarter.toString()} onValueChange={handleQuarterChange}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Next Quarter Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextQuarter}
                    className="h-10 w-10"
                    title="Next Quarter"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Current Selection Badge */}
                <div className="flex justify-center mt-4">
                  <span className="text-sm font-medium text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                    Q{quarter} {year}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-muted/30">
                <h2 className="text-lg font-semibold text-foreground">Quarterly Goals</h2>
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

            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-muted/30">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Adhoc Goals</h2>
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
                    goalCounts={adhocGoalCounts ?? undefined}
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
            className="bg-card rounded-lg shadow-sm border p-6"
          />
        )}

        {viewMode === 'markdown' && canShowSummary && summaryData && (
          <MultiQuarterlySummaryMarkdownView
            summaryData={summaryData}
            className="shadow-sm border"
          />
        )}

        {!canShowSummary && viewMode !== 'selection' && (
          <div className="bg-card rounded-lg shadow-sm border p-6 text-center">
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
