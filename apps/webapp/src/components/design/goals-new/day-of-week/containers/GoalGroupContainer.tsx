import { cn } from '@/lib/utils';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DailyGoalListContainer } from '../../DailyGoalListContainer';
import { GoalGroupHeader } from '../components/GoalGroupHeader';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { DayOfWeekType } from '@/lib/constants';

export interface GoalGroupContainerProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: DayOfWeekType;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
  isCreating?: boolean;
}

export const GoalGroupContainer = ({
  weeklyGoal,
  quarterlyGoal,
  dayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
  onCreateGoal,
  isCreating = false,
}: GoalGroupContainerProps) => {
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  // Calculate if all daily goals are complete
  const isSoftComplete =
    dailyGoals.length > 0 && dailyGoals.every((goal) => goal.state?.isComplete);

  return (
    <div>
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50' : ''
        )}
      >
        <GoalGroupHeader
          weeklyGoal={weeklyGoal}
          quarterlyGoal={quarterlyGoal}
          onUpdateGoalTitle={onUpdateGoalTitle}
        />
        <DailyGoalListContainer
          goals={dailyGoals}
          onUpdateGoalTitle={onUpdateGoalTitle}
          onDeleteGoal={onDeleteGoal}
          onCreateGoal={onCreateGoal}
          createInputPlaceholder="Add a task..."
          isCreating={isCreating}
        />
      </div>
    </div>
  );
};
