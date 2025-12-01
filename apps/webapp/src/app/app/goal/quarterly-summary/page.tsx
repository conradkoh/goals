'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { MultiQuarterlySummaryMarkdownView } from '@/components/molecules/quarterly-summary';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuarterlySummaryProvider, useQuarterlySummaryContext } from './QuarterlySummaryContext';
import { AdhocDomainSelectorPanel, QuarterlyGoalSelectorPanel } from './SelectorPanels';

/**
 * Inner component that uses the context.
 */
function QuarterlySummaryContent() {
  const router = useRouter();
  const {
    year,
    quarter,
    setYear,
    setQuarter,
    handlePreviousQuarter,
    handleNextQuarter,
    yearOptions,
    hasSelection,
    summaryData,
  } = useQuarterlySummaryContext();

  const [activeTab, setActiveTab] = React.useState<'select' | 'preview'>('select');

  // Update URL when period changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', year.toString());
    params.set('quarter', quarter.toString());
    const newUrl = `/app/goal/quarterly-summary?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [year, quarter]);

  // Set page title
  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = `Q${quarter} ${year} Quarterly Summary`;
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

  const handleYearChange = React.useCallback(
    (newYear: string) => {
      setYear(Number.parseInt(newYear));
    },
    [setYear]
  );

  const handleQuarterChange = React.useCallback(
    (newQuarter: string) => {
      setQuarter(Number.parseInt(newQuarter) as 1 | 2 | 3 | 4);
    },
    [setQuarter]
  );

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
                <span>Quarterly Summary</span>
                <span>/</span>
                <span className="font-medium text-foreground">
                  Q{quarter} {year}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Quarterly Summary</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Select goals and preview your quarterly report.
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

          {/* Tabs for Select Goals / Preview */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'select' | 'preview')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Goals</TabsTrigger>
              <TabsTrigger value="preview" disabled={!hasSelection}>
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-6 mt-6">
              <QuarterlyGoalSelectorPanel />
              <AdhocDomainSelectorPanel />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              {hasSelection && summaryData ? (
                <MultiQuarterlySummaryMarkdownView
                  summaryData={summaryData}
                  className="shadow-sm border"
                />
              ) : (
                <div className="bg-card rounded-lg shadow-sm border p-6 text-center">
                  <p className="text-muted-foreground">
                    No goals selected. Please select goals to preview the summary.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the multi-goal quarterly summary page.
 */
export default function MultiGoalQuarterlySummaryPage() {
  const searchParams = useSearchParams();

  // Get initial year and quarter from URL params
  const initialYear = searchParams.get('year')
    ? Number.parseInt(searchParams.get('year')!)
    : undefined;
  const initialQuarter = searchParams.get('quarter')
    ? (Number.parseInt(searchParams.get('quarter')!) as 1 | 2 | 3 | 4)
    : undefined;

  return (
    <QuarterlySummaryProvider initialYear={initialYear} initialQuarter={initialQuarter}>
      <QuarterlySummaryContent />
    </QuarterlySummaryProvider>
  );
}
