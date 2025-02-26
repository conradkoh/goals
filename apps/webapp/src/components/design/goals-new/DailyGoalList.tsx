import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DailyGoalItem } from './DailyGoalItem';
import { Id } from '@services/backend/convex/_generated/dataModel';

export interface DailyGoalListProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  className?: string;
}

export const DailyGoalList = ({
  goals,
  onUpdateGoalTitle,
  onDeleteGoal,
  className,
}: DailyGoalListProps) => {
  return (
    <div className={className}>
      {goals.map((goal) => (
        <DailyGoalItem
          key={goal._id}
          goal={goal}
          onUpdateTitle={onUpdateGoalTitle}
          onDelete={onDeleteGoal}
        />
      ))}
    </div>
  );
};
