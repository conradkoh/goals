import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Pin, Star } from 'lucide-react';
import { GoalActionMenu } from './GoalActionMenu';
import { GoalEditProvider, useGoalEditContext } from './GoalEditContext';
import React, { ReactNode, useState } from 'react';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/components/ui/use-toast';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    () => currentDateTime.weekday as DayOfWeek
  );

// Component that renders the edit modal content using context
const GoalEditModalContent: React.FC<{
  onSave: (title: string, details?: string) => Promise<void>;
}> = ({ onSave }) => {
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleKeyDown = useFormSubmitShortcut({
    onSubmit: handleSave,
    shouldPreventDefault: true,
  });

  React.useEffect(() => {
    if (isEditing && editingGoal) {
      setEditTitle(editingGoal.title);
      setEditDetails(editingGoal.details || '');
    }
  }, [isEditing, editingGoal]);

  async function handleSave() {
    if (!editingGoal || isSubmitting) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast({
        title: 'Error',
        description: 'Goal title cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(trimmedTitle, editDetails);
      stopEditing();
      toast({
        title: 'Success',
        description: 'Goal updated successfully',
      });
    } catch (error) {
      console.error('Failed to save goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    stopEditing();
    setEditTitle('');
    setEditDetails('');
  };

  return (
    <Dialog open={isEditing} onOpenChange={(open) => !open && stopEditing()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter goal title..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <RichTextEditor
              value={editDetails}
              onChange={setEditDetails}
              placeholder="Add goal details..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
          <GoalActionMenu
            goal={goal}
            onSave={onSave}
            isQuarterlyGoal={isQuarterlyGoal}
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
    <GoalEditProvider>
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
          <FireGoalsProvider>
            {popoverContent}
          </FireGoalsProvider>
        </PopoverContent>
      </Popover>
      <GoalEditModalContent onSave={onSave} />
    </GoalEditProvider>
  );
};
