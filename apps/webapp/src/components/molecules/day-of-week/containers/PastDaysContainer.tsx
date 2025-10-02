import { Check } from 'lucide-react';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { DayContainer, type DayContainerProps } from './DayContainer';

/**
 * Props for the past days container component.
 */
export interface PastDaysContainerProps {
  days: Omit<DayContainerProps, 'onUpdateGoalTitle' | 'onDeleteGoal' | 'onCreateGoal'>[];
  onUpdateGoalTitle: DayContainerProps['onUpdateGoalTitle'];
  onDeleteGoal: DayContainerProps['onDeleteGoal'];
  onCreateGoal: DayContainerProps['onCreateDailyGoal'];
  isCreating?: Record<string, boolean>;
  completedTasks: number;
  totalTasks: number;
  sortDailyGoals?: DayContainerProps['sortDailyGoals'];
}

/**
 * Displays a collapsible container for past days with task completion summary.
 */
export const PastDaysContainer = ({
  days,
  onUpdateGoalTitle,
  onDeleteGoal,
  onCreateGoal,
  isCreating = {},
  completedTasks,
  totalTasks,
  sortDailyGoals,
}: PastDaysContainerProps) => {
  return (
    <CollapsibleMinimal>
      <CollapsibleMinimalTrigger>
        <div className="flex justify-between w-full items-center">
          <span className="font-medium">Past Days</span>
          <div className="flex items-center text-gray-600 text-sm whitespace-nowrap ml-2">
            <Check className="w-3.5 h-3.5 mr-1 text-gray-400" />
            <span>
              {completedTasks}/{totalTasks}
            </span>
          </div>
        </div>
      </CollapsibleMinimalTrigger>
      <CollapsibleMinimalContent>
        {days.map((day) => (
          <FireGoalsProvider key={`fire-provider-${day.dayOfWeek}`}>
            <DayContainer
              key={`day-container-${day.dayOfWeek}`}
              {...day}
              onUpdateGoalTitle={onUpdateGoalTitle}
              onDeleteGoal={onDeleteGoal}
              onCreateDailyGoal={onCreateGoal}
              isCreating={isCreating}
              sortDailyGoals={sortDailyGoals}
            />
          </FireGoalsProvider>
        ))}
      </CollapsibleMinimalContent>
    </CollapsibleMinimal>
  );
};
