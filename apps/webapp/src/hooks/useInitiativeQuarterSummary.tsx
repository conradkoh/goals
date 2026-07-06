import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';

import { useSession } from '@/modules/auth/useSession';

export interface UseInitiativeQuarterSummaryProps {
  initiativeIds: Id<'initiatives'>[];
  year: number;
  quarter: number;
}

export function useInitiativeQuarterSummary({
  initiativeIds,
  year,
  quarter,
}: UseInitiativeQuarterSummaryProps) {
  const { sessionId } = useSession();

  const summaryData = useQuery(
    api.dashboard.getInitiativeQuarterSummary,
    sessionId && initiativeIds.length > 0
      ? {
          sessionId,
          selectedInitiativeIds: initiativeIds,
          year,
          quarter,
        }
      : 'skip'
  );

  return {
    summaryData,
    isLoading: summaryData === undefined,
    error: summaryData === null ? 'Failed to load initiative quarter summary' : null,
  };
}
