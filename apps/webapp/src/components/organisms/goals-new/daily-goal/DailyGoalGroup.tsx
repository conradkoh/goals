import { CreateGoalInput } from '@/components/organisms/goals-new/CreateGoalInput';
import { DailyGoalItem } from '@/components/organisms/goals-new/daily-goal/DailyGoalItem';
import { GoalEditPopover } from '@/components/organisms/goals-new/GoalEditPopover';
import { Button } from '@/components/ui/button';
import { SafeHTML } from '@/components/ui/safe-html';
import { Spinner } from '@/components/ui/spinner';
import { DayOfWeekType } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, Star, Pin } from 'lucide-react';
import { useState } from 'react';

export interface DailyGoalGroupProps {
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
  className?: string;
  sortGoals?: (
    goals: GoalWithDetailsAndChildren[]
  ) => GoalWithDetailsAndChildren[];
}

export const DailyGoalGroup = ({
  weeklyGoal,
  quarterlyGoal,
  dayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
  onCreateGoal,
  isCreating = false,
  className,
  sortGoals = (goals) => goals.sort((a, b) => a.title.localeCompare(b.title)),
}: DailyGoalGroupProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const unsortedDailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  const dailyGoals = sortGoals(unsortedDailyGoals);

  const isSoftComplete =
    dailyGoals.length > 0 && dailyGoals.every((goal) => goal.state?.isComplete);

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;
    const titleToCreate = newGoalTitle.trim();
    setNewGoalTitle(''); // Clear input immediately for better UX
    await onCreateGoal(titleToCreate);
  };

  const handleEscape = () => {
    setIsInputFocused(false);
    setNewGoalTitle('');
  };

  const isStarred = quarterlyGoal.state?.isStarred ?? false;
  const isPinned = quarterlyGoal.state?.isPinned ?? false;

  return (
    <div className={className}>
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50' : '',
          isPinned ? 'bg-blue-50' : '',
          isStarred && !isPinned ? 'bg-yellow-50' : '',
          !isStarred && !isPinned && !isSoftComplete ? 'bg-white' : ''
        )}
      >
        <div>
          <div className="flex items-center gap-1.5">
            {isStarred && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            )}
            {isPinned && (
              <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
            )}

            <GoalEditPopover
              title={quarterlyGoal.title}
              details={quarterlyGoal.details}
              onSave={async (title, details) => {
                await onUpdateGoalTitle(quarterlyGoal._id, title, details);
              }}
              trigger={
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
                >
                  <span className="break-words w-full whitespace-pre-wrap">
                    {quarterlyGoal.title}
                  </span>
                </Button>
              }
            />
          </div>
          <GoalEditPopover
            title={weeklyGoal.title}
            details={weeklyGoal.details}
            onSave={async (title, details) => {
              await onUpdateGoalTitle(weeklyGoal._id, title, details);
            }}
            trigger={
              <Button
                variant="ghost"
                className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
              >
                <span className="break-words w-full whitespace-pre-wrap text-gray-600">
                  {weeklyGoal.title}
                </span>
              </Button>
            }
          />
        </div>

        <div className="space-y-2 mt-2">
          <div>
            {dailyGoals.map((goal) => (
              <DailyGoalItem
                key={goal._id}
                goal={goal}
                onUpdateTitle={onUpdateGoalTitle}
                onDelete={onDeleteGoal}
              />
            ))}
          </div>

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
                  placeholder="Add a task..."
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
      </div>
    </div>
  );
};
