import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useSession } from '@/modules/auth/useSession';
import { MultipleQuarterlyGoalsSummary } from '@services/backend/src/usecase/getWeekDetails';

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