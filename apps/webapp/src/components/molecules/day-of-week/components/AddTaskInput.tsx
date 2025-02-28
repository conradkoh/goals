import { useState } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { DayOfWeek } from '@/lib/constants';

export interface AddTaskInputProps {
  weeklyGoalId: Id<'goals'>;
  isCreating: boolean;
  onCreateGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  forDayOfWeek?: DayOfWeek;
}

export const AddTaskInput = ({
  weeklyGoalId,
  isCreating,
  onCreateGoal,
  forDayOfWeek,
}: AddTaskInputProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        if (!newGoalTitle) {
          setIsVisible(false);
        }
      }}
    >
      <div
        className={cn(
          'transition-opacity duration-150',
          isVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <CreateGoalInput
          placeholder="Add a task..."
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={() => {
            if (newGoalTitle && newGoalTitle.trim()) {
              onCreateGoal(weeklyGoalId, newGoalTitle.trim(), forDayOfWeek);
              setNewGoalTitle('');
              setIsVisible(false);
            }
          }}
          onFocus={() => setIsVisible(true)}
          onBlur={() => {
            if (!newGoalTitle) {
              setIsVisible(false);
            }
          }}
          disabled={isCreating}
        >
          {isCreating && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </div>
          )}
        </CreateGoalInput>
      </div>
    </div>
  );
};
