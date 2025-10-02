import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useSession } from '@/modules/auth/useSession';

interface UseMultipleQuarterlyGoalsSummaryProps {
  quarterlyGoalIds: Id<'goals'>[];
  year: number;
  quarter: number;
}

export function useMultipleQuarterlyGoalsSummary({
  quarterlyGoalIds,
  year,
  quarter,
}: UseMultipleQuarterlyGoalsSummaryProps) {
  const { sessionId } = useSession();

  const summaryData = useQuery(
    api.dashboard.getMultipleQuarterlyGoalsSummary,
    sessionId && quarterlyGoalIds.length > 0
      ? {
          sessionId,
          quarterlyGoalIds,
          year,
          quarter,
        }
      : 'skip'
  );

  return {
    summaryData,
    isLoading: summaryData === undefined,
    error: summaryData === null ? 'Failed to load multiple quarterly goals summary' : null,
  };
}
