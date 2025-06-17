import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Edit2, Pin, Star, FileText } from 'lucide-react';
import { QuarterlyGoalSummaryPopover } from '@/components/molecules/quarterly-summary';
import React, { ReactNode, useState } from 'react';
import { GoalDetailsContent } from './GoalDetailsContent';
import { GoalDetailsChildrenList } from './GoalDetailsChildrenList';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { FireGoalsProvider } from '@/contexts/FireGoalsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { DateTime } from 'luxon';
import {
  GoalStarPin,
  GoalStarPinContainer,
} from '@/components/atoms/GoalStarPin';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    quarter,
    createWeeklyGoalOptimistic,
    createDailyGoalOptimistic,
    updateQuarterlyGoalStatus,
  } = useWeek();
  const currentDateTime = useCurrentDateTime();

  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');
  const [newDailyGoalTitle, setNewDailyGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(
    () => (currentDateTime.weekday as DayOfWeek)
  );

  const shouldShowChildGoals = goal && (goal.depth === 0 || goal.depth === 1);
  const isQuarterlyGoal = goal?.depth === 0;
  const isWeeklyGoal = goal?.depth === 1;
  const isComplete = goal.isComplete;
  const isStarred = goal.state?.isStarred || false;
  const isPinned = goal.state?.isPinned || false;

  const handleToggleStar = async () => {
    if (isQuarterlyGoal) {
      await updateQuarterlyGoalStatus({
        goalId: goal._id,
        weekNumber,
        year,
        quarter,
        isStarred: !isStarred,
        isPinned: false, // Always set pinned to false when starring
      });
    }
  };

  const handleTogglePin = async () => {
    if (isQuarterlyGoal) {
      await updateQuarterlyGoalStatus({
        goalId: goal._id,
        weekNumber,
        year,
        quarter,
        isStarred: false, // Always set starred to false when pinning
        isPinned: !isPinned,
      });
    }
  };

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
        <div className="flex items-center gap-2">
          {isQuarterlyGoal && (
            <GoalStarPinContainer>
              <GoalStarPin
                value={{
                  isStarred,
                  isPinned,
                }}
                onStarred={handleToggleStar}
                onPinned={handleTogglePin}
              />
            </GoalStarPinContainer>
          )}
          {isQuarterlyGoal && (
            <QuarterlyGoalSummaryPopover
              quarterlyGoal={goal}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>View Summary</span>
                </Button>
              }
            />
          )}
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
      </div>

      {/* Status indicators */}
      {isQuarterlyGoal && (isStarred || isPinned) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isStarred && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>Starred</span>
            </div>
          )}
          {isPinned && (
            <div className="flex items-center gap-1">
              <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
              <span>Pinned</span>
            </div>
          )}
        </div>
      )}

      {/* Display completion date if the goal is complete */}
      {isComplete && goal.completedAt && (
        <div className="text-xs text-muted-foreground mt-1">
          Completed on{' '}
          {DateTime.fromMillis(goal.completedAt).toFormat('LLL d, yyyy')}
        </div>
      )}

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
                    >
                      <div className="mt-2">
                        <Select
                          value={selectedDayOfWeek.toString()}
                          onValueChange={(value) =>
                            setSelectedDayOfWeek(parseInt(value) as DayOfWeek)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(DayOfWeek).map((value) => (
                              <SelectItem key={value} value={value.toString()}>
                                {getDayName(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CreateGoalInput>
                  </div>
                </>
              )}
            </div>
          </>
        )}
    </div>
  );

  return (
    <Popover key={`goal-details-${goal._id.toString()}`}>
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
