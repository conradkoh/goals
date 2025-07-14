import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { QuarterlyGoalOption } from '@services/backend/src/usecase/getWeekDetails';

interface UseQuarterlyGoalsListProps {
  year: number;
  quarter: number;
}

export function useQuarterlyGoalsList({
  year,
  quarter,
}: UseQuarterlyGoalsListProps) {
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