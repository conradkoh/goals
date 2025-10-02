import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { CreateGoalInput } from '../atoms/CreateGoalInput';
import { DailyGoalList } from './DailyGoalList';

export interface DailyGoalListContainerProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoalTitle: (goalId: Id<'goals'>, title: string, details?: string) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
  className?: string;
  createInputPlaceholder?: string;
  isCreating?: boolean;
  children?: React.ReactNode; // For additional UI elements like selectors
}

export const DailyGoalListContainer = ({
  goals,
  onUpdateGoalTitle,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: reserved for future delete capability in this container
  onDeleteGoal,
  onCreateGoal,
  className,
  createInputPlaceholder = 'Add a goal...',
  isCreating = false,
  children,
}: DailyGoalListContainerProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;
    await onCreateGoal(newGoalTitle.trim());
    setNewGoalTitle('');
  };

  const handleEscape = () => {
    setIsInputFocused(false);
    setNewGoalTitle('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <DailyGoalList goals={goals} onUpdateGoalTitle={onUpdateGoalTitle} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Mouse interactions are needed for visibility control */}
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !isInputFocused && setIsHovering(false)}
      >
        <div
          className={cn(
            'transition-opacity duration-150',
            isInputFocused || isHovering
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="relative">
            <CreateGoalInput
              placeholder={createInputPlaceholder}
              value={newGoalTitle}
              onChange={setNewGoalTitle}
              onSubmit={handleSubmit}
              onEscape={handleEscape}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                if (!newGoalTitle) {
                  setIsInputFocused(false);
                  setIsHovering(false);
                }
              }}
              autoFocus={isInputFocused}
              disabled={isCreating}
            >
              {children}
              {isCreating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Spinner className="h-4 w-4" />
                </div>
              )}
            </CreateGoalInput>
          </div>
        </div>
      </div>
    </div>
  );
};
