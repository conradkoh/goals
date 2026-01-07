import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';

import { useSession } from '@/modules/auth/useSession';

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
