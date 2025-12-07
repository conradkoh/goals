import { api } from '@services/backend/convex/_generated/api';
import type { QuarterlyGoalOption } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { useSession } from '@/modules/auth/useSession';

interface UseQuarterlyGoalsListProps {
  year: number;
  quarter: number;
}

export function useQuarterlyGoalsList({ year, quarter }: UseQuarterlyGoalsListProps) {
  const { sessionId } = useSession();

  const goalsData = useQuery(
    api.dashboard.getAllQuarterlyGoalsForQuarter,
    sessionId
      ? {
          sessionId,
          year,
          quarter,
        }
      : 'skip'
  );

  return {
    goals: goalsData as QuarterlyGoalOption[] | undefined,
    isLoading: goalsData === undefined,
    error: goalsData === null ? 'Failed to load quarterly goals list' : null,
  };
}
