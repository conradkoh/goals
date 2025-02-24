import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { DayOfWeek, DayOfWeekType } from '@/lib/constants';
import { isOptimisticId } from '@/hooks/useOptimistic';

export interface DailyGoalDetails {
  title: string;
  details?: string;
  isComplete: boolean;
  isPinned: boolean;
  isStarred: boolean;
  weekNumber?: number;
  dayOfWeek?: DayOfWeekType;
}

export interface UseDailyGoalOptions {
  weekNumber: number;
  dayOfWeek: DayOfWeekType;
}

export function useDailyGoal(
  goalId: Id<'goals'>,
  options: UseDailyGoalOptions
): DailyGoalDetails | null {
  const { sessionId } = useSession();
  const { weekNumber, dayOfWeek } = options;
  const isOptimistic = isOptimisticId(goalId);

  const goalDetails = useQuery(
    api.dashboard.useDailyGoal,
    isOptimistic
      ? 'skip'
      : {
          sessionId,
          goalId,
          weekNumber,
          dayOfWeek,
        }
  );

  if (!goalDetails) return null;

  return {
    ...goalDetails,
    dayOfWeek: goalDetails.dayOfWeek as DayOfWeekType,
  };
}
