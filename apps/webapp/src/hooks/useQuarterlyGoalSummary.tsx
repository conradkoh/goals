import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useSession } from '@/modules/auth/useSession';
import { QuarterlyGoalSummary } from '@services/backend/src/usecase/getWeekDetails';

interface UseQuarterlyGoalSummaryProps {
  quarterlyGoalId: Id<'goals'>;
  year: number;
  quarter: number;
}

export function useQuarterlyGoalSummary({
  quarterlyGoalId,
  year,
  quarter,
}: UseQuarterlyGoalSummaryProps) {
  const { sessionId } = useSession();

  const summaryData = useQuery(
    api.dashboard.getQuarterlyGoalSummary,
    sessionId
      ? {
          sessionId,
          quarterlyGoalId,
          year,
          quarter,
        }
      : 'skip'
  );

  return {
    summaryData,
    isLoading: summaryData === undefined,
    error: summaryData === null ? 'Failed to load quarterly goal summary' : null,
  };
} 