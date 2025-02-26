import { DayOfWeek } from '@/lib/constants';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DayHeader } from '../components/DayHeader';
import { GoalGroupContainer } from './GoalGroupContainer';
import { Id } from '@services/backend/convex/_generated/dataModel';

export interface DayContainerProps {
  dayOfWeek: DayOfWeek;
  weekNumber: number;
  dateTimestamp: number;
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (weeklyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating?: Record<string, boolean>;
}

export const DayContainer = ({
  dayOfWeek,
  weekNumber,
  dateTimestamp,
  weeklyGoalsWithQuarterly,
  onUpdateGoalTitle,
  onDeleteGoal,
  onCreateGoal,
  isCreating = {},
}: DayContainerProps) => {
  return (
    <div className="space-y-2 mb-1 border-b border-gray-100 last:border-b-0">
      <DayHeader
        dayOfWeek={dayOfWeek}
        weekNumber={weekNumber}
        dateTimestamp={dateTimestamp}
      />
      <div>
        {weeklyGoalsWithQuarterly.map(({ weeklyGoal, quarterlyGoal }) => (
          <GoalGroupContainer
            key={weeklyGoal._id}
            weeklyGoal={weeklyGoal}
            quarterlyGoal={quarterlyGoal}
            dayOfWeek={dayOfWeek}
            onUpdateGoalTitle={onUpdateGoalTitle}
            onDeleteGoal={onDeleteGoal}
            onCreateGoal={(title) => onCreateGoal(weeklyGoal._id, title)}
            isCreating={isCreating[weeklyGoal._id]}
          />
        ))}
      </div>
    </div>
  );
};
