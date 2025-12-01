'use client';

import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { QuarterlyGoalOption } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { DateTime } from 'luxon';
import React from 'react';
import { useDomains } from '@/hooks/useDomains';
import { useQuarterlyGoalsList } from '@/hooks/useQuarterlyGoalsList';
import { useQuarterSummary } from '@/hooks/useQuarterSummary';
import { useSession } from '@/modules/auth/useSession';

interface QuarterlySummaryContextValue {
  // Period state
  year: number;
  quarter: 1 | 2 | 3 | 4;
  setYear: (year: number) => void;
  setQuarter: (quarter: 1 | 2 | 3 | 4) => void;
  handlePreviousQuarter: () => void;
  handleNextQuarter: () => void;

  // Quarterly goals
  quarterlyGoals: QuarterlyGoalOption[] | undefined;
  selectedGoalIds: Id<'goals'>[];
  setSelectedGoalIds: (ids: Id<'goals'>[]) => void;
  isLoadingQuarterlyGoals: boolean;

  // Adhoc domains
  domains: { _id: Id<'domains'>; name: string; color?: string }[] | undefined;
  selectedAdhocDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[];
  setSelectedAdhocDomainIds: (ids: (Id<'domains'> | 'UNCATEGORIZED')[]) => void;
  adhocGoalCounts: Record<string, { total: number; completed: number }> | undefined;

  // Summary data
  summaryData: ReturnType<typeof useQuarterSummary>['summaryData'];
  hasSelection: boolean;

  // Year options for selector
  yearOptions: number[];
}

const QuarterlySummaryContext = React.createContext<QuarterlySummaryContextValue | null>(null);

export function useQuarterlySummaryContext() {
  const context = React.useContext(QuarterlySummaryContext);
  if (!context) {
    throw new Error('useQuarterlySummaryContext must be used within QuarterlySummaryProvider');
  }
  return context;
}

interface QuarterlySummaryProviderProps {
  children: React.ReactNode;
  initialYear?: number;
  initialQuarter?: 1 | 2 | 3 | 4;
}

export function QuarterlySummaryProvider({
  children,
  initialYear,
  initialQuarter,
}: QuarterlySummaryProviderProps) {
  const now = DateTime.now();
  const defaultYear = initialYear ?? now.year;
  const defaultQuarter = initialQuarter ?? (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);

  // Period state
  const [year, setYear] = React.useState(defaultYear);
  const [quarter, setQuarter] = React.useState<1 | 2 | 3 | 4>(defaultQuarter);

  // Selection state
  const [selectedGoalIds, setSelectedGoalIds] = React.useState<Id<'goals'>[]>([]);
  const [selectedAdhocDomainIds, setSelectedAdhocDomainIds] = React.useState<
    (Id<'domains'> | 'UNCATEGORIZED')[]
  >([]);

  // Session and data fetching
  const { sessionId } = useSession();
  const { domains } = useDomains(sessionId);
  const { goals: quarterlyGoals, isLoading: isLoadingQuarterlyGoals } = useQuarterlyGoalsList({
    year,
    quarter,
  });

  // Fetch adhoc goal counts per domain
  const adhocGoalCounts = useQuery(
    api.dashboard.getAdhocGoalCountsByDomainForQuarter,
    sessionId ? { sessionId, year, quarter } : 'skip'
  );

  // Track previous quarter for auto-selection
  const previousQuarterRef = React.useRef({ year, quarter });

  // Auto-select non-empty goals when quarter changes or data loads
  React.useEffect(() => {
    const quarterChanged =
      previousQuarterRef.current.year !== year || previousQuarterRef.current.quarter !== quarter;

    // If quarter changed, reset selections first
    if (quarterChanged) {
      previousQuarterRef.current = { year, quarter };
      setSelectedGoalIds([]);
      setSelectedAdhocDomainIds([]);
    }

    // Auto-select quarterly goals with weekly goals
    if (quarterlyGoals && quarterlyGoals.length > 0) {
      const currentlyEmpty = selectedGoalIds.length === 0;
      if (currentlyEmpty || quarterChanged) {
        const nonEmptyGoalIds = quarterlyGoals
          .filter((g) => g.weeklyGoalCount > 0)
          .map((g) => g._id);
        if (nonEmptyGoalIds.length > 0) {
          setSelectedGoalIds(nonEmptyGoalIds);
        }
      }
    }
  }, [year, quarter, quarterlyGoals, selectedGoalIds.length]);

  // Auto-select non-empty adhoc domains when quarter changes or data loads
  React.useEffect(() => {
    const quarterChanged =
      previousQuarterRef.current.year !== year || previousQuarterRef.current.quarter !== quarter;

    if (domains && adhocGoalCounts) {
      const currentlyEmpty = selectedAdhocDomainIds.length === 0;
      if (currentlyEmpty || quarterChanged) {
        const nonEmptyDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[] = [];
        for (const domain of domains) {
          const count = adhocGoalCounts[domain._id];
          if (count && count.total > 0) {
            nonEmptyDomainIds.push(domain._id);
          }
        }
        const uncategorizedCount = adhocGoalCounts.UNCATEGORIZED;
        if (uncategorizedCount && uncategorizedCount.total > 0) {
          nonEmptyDomainIds.push('UNCATEGORIZED');
        }
        if (nonEmptyDomainIds.length > 0) {
          setSelectedAdhocDomainIds(nonEmptyDomainIds);
        }
      }
    }
  }, [year, quarter, domains, adhocGoalCounts, selectedAdhocDomainIds.length]);

  // Summary data
  const includeAdhocGoals = selectedAdhocDomainIds.length > 0;
  const { summaryData } = useQuarterSummary({
    quarterlyGoalIds: selectedGoalIds,
    year,
    quarter,
    includeAdhocGoals,
    adhocDomainIds: selectedAdhocDomainIds,
  });

  // Navigation handlers
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

  // Year options
  const currentYear = DateTime.now().year;
  const yearOptions = React.useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const hasSelection = selectedGoalIds.length > 0 || includeAdhocGoals;

  const value: QuarterlySummaryContextValue = {
    year,
    quarter,
    setYear,
    setQuarter,
    handlePreviousQuarter,
    handleNextQuarter,
    quarterlyGoals,
    selectedGoalIds,
    setSelectedGoalIds,
    isLoadingQuarterlyGoals,
    domains,
    selectedAdhocDomainIds,
    setSelectedAdhocDomainIds,
    adhocGoalCounts: adhocGoalCounts ?? undefined,
    summaryData,
    hasSelection,
    yearOptions,
  };

  return (
    <QuarterlySummaryContext.Provider value={value}>{children}</QuarterlySummaryContext.Provider>
  );
}
