import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Edit2 } from 'lucide-react';
import React, { ReactNode, useState } from 'react';
import { GoalDetailsContent } from './GoalDetailsContent';
import { GoalDetailsChildrenList } from './GoalDetailsChildrenList';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { FireGoalsProvider } from '@/contexts/FireGoalsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { DateTime } from 'luxon';

interface GoalDetailsPopoverProps {
  goal: GoalWithDetailsAndChildren;
  onSave: (title: string, details?: string) => Promise<void>;
  triggerClassName?: string;
  buttonVariant?: 'default' | 'ghost' | 'outline';
  titleClassName?: string;
  additionalContent?: ReactNode;
  onToggleComplete?: (isComplete: boolean) => Promise<void>;
}

export const GoalDetailsPopover: React.FC<GoalDetailsPopoverProps> = ({
  goal,
  onSave,
  triggerClassName = 'p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full mb-1',
  buttonVariant = 'ghost',
  titleClassName = 'text-gray-600',
  additionalContent,
  onToggleComplete,
}) => {
  const {
    weekNumber,
    year,
    createWeeklyGoalOptimistic,
    createDailyGoalOptimistic,
  } = useWeek();

  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');
  const [newDailyGoalTitle, setNewDailyGoalTitle] = useState('');
  const [selectedDayOfWeek] = useState<DayOfWeek>(DayOfWeek.MONDAY);

  const shouldShowChildGoals = goal && (goal.depth === 0 || goal.depth === 1);
  const isQuarterlyGoal = goal?.depth === 0;
  const isWeeklyGoal = goal?.depth === 1;
  const isComplete = goal.state?.isComplete ?? false;

  const handleCreateWeeklyGoal = async () => {
    const trimmedTitle = newWeeklyGoalTitle.trim();
    if (trimmedTitle && isQuarterlyGoal) {
      try {
        setNewWeeklyGoalTitle('');
        await createWeeklyGoalOptimistic(goal._id, trimmedTitle);
      } catch (error) {
        console.error('Failed to create weekly goal:', error);
        setNewWeeklyGoalTitle(trimmedTitle);
      }
    }
  };

  const handleCreateDailyGoal = async () => {
    const trimmedTitle = newDailyGoalTitle.trim();
    if (trimmedTitle && isWeeklyGoal) {
      try {
        setNewDailyGoalTitle('');

        const dateTimestamp = DateTime.fromObject({
          weekNumber,
          weekYear: year,
        })
          .startOf('week')
          .plus({ days: selectedDayOfWeek - 1 })
          .toMillis();

        await createDailyGoalOptimistic(
          goal._id,
          trimmedTitle,
          selectedDayOfWeek,
          dateTimestamp
        );
      } catch (error) {
        console.error('Failed to create daily goal:', error);
        setNewDailyGoalTitle(trimmedTitle);
      }
    }
  };

  const popoverContent = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Checkbox
            className="flex-shrink-0"
            checked={isComplete}
            disabled={!onToggleComplete}
            onCheckedChange={(checked) => onToggleComplete?.(checked === true)}
          />
          <h3 className="font-semibold text-lg break-words flex-1 leading-tight">
            {goal.title}
          </h3>
        </div>
        <GoalEditPopover
          title={goal.title}
          details={goal.details}
          onSave={onSave}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          }
        />
      </div>

      {goal.details && (
        <>
          <Separator className="my-2" />
          <div className="pt-1">
            <GoalDetailsContent title={goal.title} details={goal.details} />
          </div>
        </>
      )}

      {additionalContent && (
        <>
          <Separator className="my-2" />
          <div className="pt-1">{additionalContent}</div>
        </>
      )}

      {shouldShowChildGoals &&
        goal &&
        ((goal.children && goal.children.length > 0) ||
          isQuarterlyGoal ||
          isWeeklyGoal) && (
          <>
            <Separator className="my-2" />
            <div className="pt-1 space-y-3">
              {isQuarterlyGoal && (
                <>
                  {goal.children && goal.children.length > 0 && (
                    <GoalDetailsChildrenList
                      parentGoal={goal}
                      title="Weekly Goals"
                    />
                  )}
                  <div className="pl-4 pt-1">
                    <CreateGoalInput
                      placeholder="Add a new weekly goal..."
                      value={newWeeklyGoalTitle}
                      onChange={setNewWeeklyGoalTitle}
                      onSubmit={handleCreateWeeklyGoal}
                      onEscape={() => setNewWeeklyGoalTitle('')}
                    />
                  </div>
                </>
              )}
              {isWeeklyGoal && (
                <>
                  {goal.children && goal.children.length > 0 && (
                    <GoalDetailsChildrenList
                      parentGoal={goal}
                      title="Daily Goals"
                    />
                  )}
                  <div className="pl-4 pt-1">
                    <CreateGoalInput
                      placeholder="Add a new daily goal..."
                      value={newDailyGoalTitle}
                      onChange={setNewDailyGoalTitle}
                      onSubmit={handleCreateDailyGoal}
                      onEscape={() => setNewDailyGoalTitle('')}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} className={triggerClassName}>
          <span
            className={cn(
              'break-words w-full whitespace-pre-wrap',
              titleClassName
            )}
          >
            {goal.title}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] max-w-[calc(100vw-32px)] p-5">
        <FireGoalsProvider>{popoverContent}</FireGoalsProvider>
      </PopoverContent>
    </Popover>
  );
};
