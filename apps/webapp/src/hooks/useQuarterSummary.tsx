import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the useQuarterSummary hook.
 */
export interface UseQuarterSummaryProps {
  /** Array of quarterly goal IDs to include in the summary */
  quarterlyGoalIds: Id<'goals'>[];
  /** Year of the quarter to summarize */
  year: number;
  /** Quarter number (1-4) to summarize */
  quarter: number;
  /** Whether to include adhoc goals in the summary */
  includeAdhocGoals?: boolean;
  /** Optional array of domain IDs to filter adhoc goals (can include 'UNCATEGORIZED') */
  adhocDomainIds?: (Id<'domains'> | 'UNCATEGORIZED')[];
}

/**
 * Return type for the useQuarterSummary hook.
 */
export interface UseQuarterSummaryResult {
  /** The quarter summary data, undefined while loading, null if failed */
  summaryData: ReturnType<typeof useQuery<typeof api.dashboard.getQuarterSummary>>;
  /** True while the summary data is being loaded */
  isLoading: boolean;
  /** Error message if the query failed, null otherwise */
  error: string | null;
}

/**
 * Hook for fetching quarterly summary data including quarterly goals, weekly goals,
 * daily goals, and optionally adhoc goals filtered by domain.
 *
 * @param props - Configuration for the quarter summary query
 * @returns Object containing summary data, loading state, and error state
 *
 * @example
 * ```tsx
 * const { summaryData, isLoading, error } = useQuarterSummary({
 *   quarterlyGoalIds: ['goal1', 'goal2'],
 *   year: 2025,
 *   quarter: 4,
 *   includeAdhocGoals: true,
 *   adhocDomainIds: ['domain1']
 * });
 * ```
 */
export function useQuarterSummary({
  quarterlyGoalIds,
  year,
  quarter,
  includeAdhocGoals,
  adhocDomainIds,
}: UseQuarterSummaryProps): UseQuarterSummaryResult {
  const { sessionId } = useSession();

  const summaryData = useQuery(
    api.dashboard.getQuarterSummary,
    sessionId
      ? {
          sessionId,
          selectedQuarterlyGoalIds: quarterlyGoalIds,
          year,
          quarter,
          includeAdhocGoals,
          adhocDomainIds,
        }
      : 'skip'
  );

  return {
    summaryData,
    isLoading: summaryData === undefined,
    error: summaryData === null ? 'Failed to load quarter summary' : null,
  };
}
