import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';

import { isOptimisticId } from '@/hooks/useOptimistic';
import type { DayOfWeekType } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

export interface DailyGoalDetails {
  title: string;
  details?: string;
  isComplete: boolean;
  isPinned: boolean;
  isStarred: boolean;
  completedAt?: number;
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
