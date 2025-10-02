import type { Id } from '@services/backend/convex/_generated/dataModel';
import { useCallback, useRef, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { useToast } from '@/components/ui/use-toast';
import type { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface AddTaskInputProps {
  parentGoalId: Id<'goals'>;
  isOptimistic: boolean; //this will affect the submission behavior
  onCreateGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  forDayOfWeek?: DayOfWeek;
}

export const AddTaskInput = ({
  parentGoalId,
  isOptimistic,
  onCreateGoal,
  forDayOfWeek,
}: AddTaskInputProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle successful task creation
  const handleSubmit = async () => {
    if (newGoalTitle?.trim()) {
      try {
        // Store the current title in case we need to restore it after an error
        const currentTitle = newGoalTitle.trim();

        // Clear the input immediately if using optimistic updates
        if (isOptimistic) {
          setNewGoalTitle('');
        }

        // Attempt to create the goal
        await onCreateGoal(parentGoalId, currentTitle, forDayOfWeek);

        // Only clear the input here if not using optimistic updates
        if (!isOptimistic) {
          setNewGoalTitle('');
        }

        // Keep the input visible and focused after submission
        setIsVisible(true);
        // Focus the input after a short delay to ensure the DOM has updated
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      } catch (error) {
        // Show error toast
        toast({
          title: 'Failed to create task',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: 'destructive',
        });

        console.error('Failed to create goal:', error);
      }
    }
  };

  // Handle escape key press
  const handleEscape = useCallback(() => {
    setNewGoalTitle('');
    setIsVisible(false);
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Mouse interactions are needed for visibility control
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        // we preserve the title if either the input is focused or the title is not empty
        const isInputFocused = document.activeElement?.isEqualNode(inputRef.current);
        if (!(isInputFocused || newGoalTitle)) {
          setIsVisible(false);
        }
      }}
    >
      <div
        className={cn(
          'transition-opacity duration-150',
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <CreateGoalInput
          ref={inputRef}
          placeholder="Add a task..."
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={handleSubmit}
          onEscape={handleEscape}
          onFocus={() => setIsVisible(true)}
          onBlur={() => {
            // Only hide if empty and not actively being used
            if (!newGoalTitle) {
              // Small delay to allow for click events to process
              setTimeout(() => setIsVisible(false), 100);
            }
          }}
        />
      </div>
    </div>
  );
};
