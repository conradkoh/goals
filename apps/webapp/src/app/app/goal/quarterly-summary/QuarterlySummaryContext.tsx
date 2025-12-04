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

/**
 * Context value for quarterly summary state and actions.
 * Provides access to period selection, goal selection, and summary data.
 */
export interface QuarterlySummaryContextValue {
  /** Current year for the quarterly summary */
  year: number;
  /** Current quarter (1-4) for the quarterly summary */
  quarter: 1 | 2 | 3 | 4;
  /** Updates the selected year */
  setYear: (year: number) => void;
  /** Updates the selected quarter */
  setQuarter: (quarter: 1 | 2 | 3 | 4) => void;
  /** Navigates to the previous quarter */
  handlePreviousQuarter: () => void;
  /** Navigates to the next quarter */
  handleNextQuarter: () => void;
  /** List of quarterly goals available for selection */
  quarterlyGoals: QuarterlyGoalOption[] | undefined;
  /** IDs of currently selected quarterly goals */
  selectedGoalIds: Id<'goals'>[];
  /** Updates the selected quarterly goal IDs */
  setSelectedGoalIds: (ids: Id<'goals'>[]) => void;
  /** Whether quarterly goals are currently loading */
  isLoadingQuarterlyGoals: boolean;
  /** List of available domains for adhoc goal filtering */
  domains: { _id: Id<'domains'>; name: string; color?: string }[] | undefined;
  /** IDs of currently selected domains for adhoc goals */
  selectedAdhocDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[];
  /** Updates the selected adhoc domain IDs */
  setSelectedAdhocDomainIds: (ids: (Id<'domains'> | 'UNCATEGORIZED')[]) => void;
  /** Goal counts per domain for adhoc goals */
  adhocGoalCounts: Record<string, { total: number; completed: number }> | undefined;
  /** Summary data for the selected goals */
  summaryData: ReturnType<typeof useQuarterSummary>['summaryData'];
  /** Whether summary data is currently loading */
  isLoadingSummary: boolean;
  /** Whether any goals or domains are selected */
  hasSelection: boolean;
  /** Available years for selection in the year dropdown */
  yearOptions: number[];
}

/**
 * Props for the QuarterlySummaryProvider component.
 */
export interface QuarterlySummaryProviderProps {
  /** Child components to render within the provider */
  children: React.ReactNode;
  /** Optional initial year (defaults to current year) */
  initialYear?: number;
  /** Optional initial quarter (defaults to current quarter) */
  initialQuarter?: 1 | 2 | 3 | 4;
}

/**
 * Internal type for tracking quarter period.
 */
interface _QuarterPeriod {
  year: number;
  quarter: number;
}

const _QuarterlySummaryContext = React.createContext<QuarterlySummaryContextValue | null>(null);

/**
 * Hook to access the quarterly summary context.
 * Must be used within a QuarterlySummaryProvider.
 * @returns The quarterly summary context value
 * @throws Error if used outside of QuarterlySummaryProvider
 */
export function useQuarterlySummaryContext(): QuarterlySummaryContextValue {
  const context = React.useContext(_QuarterlySummaryContext);
  if (!context) {
    throw new Error('useQuarterlySummaryContext must be used within QuarterlySummaryProvider');
  }
  return context;
}

/**
 * Provider component for quarterly summary state management.
 * Manages period selection, goal selection, and auto-selection logic.
 *
 * @example
 * ```tsx
 * <QuarterlySummaryProvider initialYear={2024} initialQuarter={4}>
 *   <QuarterlyGoalSelectorPanel />
 *   <AdhocDomainSelectorPanel />
 * </QuarterlySummaryProvider>
 * ```
 */
export function QuarterlySummaryProvider({
  children,
  initialYear,
  initialQuarter,
}: QuarterlySummaryProviderProps) {
  const now = DateTime.now();
  const defaultYear = initialYear ?? now.year;
  const defaultQuarter = initialQuarter ?? (Math.ceil(now.month / 3) as 1 | 2 | 3 | 4);

  const [year, setYear] = React.useState(defaultYear);
  const [quarter, setQuarter] = React.useState<1 | 2 | 3 | 4>(defaultQuarter);

  const [selectedGoalIds, setSelectedGoalIds] = React.useState<Id<'goals'>[]>([]);
  const [selectedAdhocDomainIds, setSelectedAdhocDomainIds] = React.useState<
    (Id<'domains'> | 'UNCATEGORIZED')[]
  >([]);

  const { sessionId } = useSession();
  const { domains } = useDomains(sessionId);
  const { goals: quarterlyGoals, isLoading: isLoadingQuarterlyGoals } = useQuarterlyGoalsList({
    year,
    quarter,
  });

  const adhocGoalCounts = useQuery(
    api.dashboard.getAdhocGoalCountsByDomainForQuarter,
    sessionId ? { sessionId, year, quarter } : 'skip'
  );

  const previousQuarterRef = React.useRef<_QuarterPeriod>({ year, quarter });
  const hasAutoSelectedGoalsRef = React.useRef(false);
  const hasAutoSelectedDomainsRef = React.useRef(false);

  // Reset auto-selection flags when quarter changes
  React.useEffect(() => {
    const quarterChanged =
      previousQuarterRef.current.year !== year || previousQuarterRef.current.quarter !== quarter;

    if (quarterChanged) {
      previousQuarterRef.current = { year, quarter };
      hasAutoSelectedGoalsRef.current = false;
      hasAutoSelectedDomainsRef.current = false;
      setSelectedGoalIds([]);
      setSelectedAdhocDomainIds([]);
    }
  }, [year, quarter]);

  // Auto-select quarterly goals with weekly goals (only on initial load for this quarter)
  React.useEffect(() => {
    if (hasAutoSelectedGoalsRef.current) return;

    if (quarterlyGoals && quarterlyGoals.length > 0) {
      const nonEmptyGoalIds = quarterlyGoals.filter((g) => g.weeklyGoalCount > 0).map((g) => g._id);
      if (nonEmptyGoalIds.length > 0) {
        hasAutoSelectedGoalsRef.current = true;
        setSelectedGoalIds(nonEmptyGoalIds);
      }
    }
  }, [quarterlyGoals]);

  // Auto-select non-empty adhoc domains (only on initial load for this quarter)
  React.useEffect(() => {
    if (hasAutoSelectedDomainsRef.current) return;

    if (domains && adhocGoalCounts) {
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
        hasAutoSelectedDomainsRef.current = true;
        setSelectedAdhocDomainIds(nonEmptyDomainIds);
      }
    }
  }, [domains, adhocGoalCounts]);

  const includeAdhocGoals = selectedAdhocDomainIds.length > 0;
  const { summaryData, isLoading: isLoadingSummary } = useQuarterSummary({
    quarterlyGoalIds: selectedGoalIds,
    year,
    quarter,
    includeAdhocGoals,
    adhocDomainIds: selectedAdhocDomainIds,
  });

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
    isLoadingSummary,
    hasSelection,
    yearOptions,
  };

  return (
    <_QuarterlySummaryContext.Provider value={value}>{children}</_QuarterlySummaryContext.Provider>
  );
}
