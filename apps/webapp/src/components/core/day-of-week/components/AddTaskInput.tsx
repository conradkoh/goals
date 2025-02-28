import { useState } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { CreateGoalInput } from '@/components/organisms/goals-new/CreateGoalInput';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface AddTaskInputProps {
  weeklyGoalId: Id<'goals'>;
  isCreating: boolean;
  onCreateGoal: (weeklyGoalId: Id<'goals'>, title: string) => Promise<void>;
}

export const AddTaskInput = ({
  weeklyGoalId,
  isCreating,
  onCreateGoal,
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
              onCreateGoal(weeklyGoalId, newGoalTitle.trim());
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
