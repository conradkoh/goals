import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { CalendarIcon, Pin, Star } from 'lucide-react';
import { DateTime } from 'luxon';
import React, { type ReactNode, useMemo, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { GoalActionMenu } from './GoalActionMenu';
import { GoalDetailsChildrenList } from './GoalDetailsChildrenList';
import { GoalDetailsContent } from './GoalDetailsContent';
import { GoalEditProvider, useGoalEditContext } from './GoalEditContext';

interface GoalDetailsPopoverProps {
  goal: GoalWithDetailsAndChildren;
  onSave: (title: string, details?: string, dueDate?: number) => Promise<void>;
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

  // Memoize the current weekday to avoid re-renders from minute timer updates
  const currentWeekday = useMemo(() => {
    return DateTime.now().weekday as DayOfWeek;
  }, []); // Empty dependency array - we only need the initial weekday

  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');
  const [newDailyGoalTitle, setNewDailyGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => currentWeekday);

  // Component that renders the edit modal content using context
  const GoalEditModalContent: React.FC<{
    onSave: (title: string, details?: string, dueDate?: number) => Promise<void>;
  }> = ({ onSave }) => {
    const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
    const [editTitle, setEditTitle] = useState('');
    const [editDetails, setEditDetails] = useState('');
    const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const { toast } = useToast();

    const handleKeyDown = useFormSubmitShortcut({
      onSubmit: handleSave,
      shouldPreventDefault: true,
    });

    // Initialize form data and preserve it across re-renders
    React.useEffect(() => {
      if (isEditing && editingGoal && !hasInitialized) {
        console.log('[GoalDetailsPopover] Initializing edit form:', {
          goalId: editingGoal._id,
          title: editingGoal.title,
          hasDueDate: !!editingGoal.dueDate,
          dueDate: editingGoal.dueDate,
          dueDateAsDate: editingGoal.dueDate ? new Date(editingGoal.dueDate) : undefined,
        });
        setEditTitle(editingGoal.title);
        setEditDetails(editingGoal.details || '');
        setEditDueDate(editingGoal.dueDate ? new Date(editingGoal.dueDate) : undefined);
        setHasInitialized(true);
      }
    }, [isEditing, editingGoal, hasInitialized]);

    // Reset initialization flag when modal closes
    React.useEffect(() => {
      if (!isEditing) {
        setHasInitialized(false);
      }
    }, [isEditing]);

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

      const dueDateTimestamp = editDueDate?.getTime();
      console.log('[GoalDetailsPopover] Saving goal:', {
        goalId: editingGoal._id,
        title: trimmedTitle,
        hasDetails: !!editDetails,
        detailsLength: editDetails?.length,
        hasDueDate: !!editDueDate,
        dueDate: editDueDate,
        dueDateTimestamp,
        dueDateFormatted: editDueDate ? editDueDate.toISOString() : undefined,
      });

      setIsSubmitting(true);
      try {
        await onSave(trimmedTitle, editDetails, dueDateTimestamp);
        console.log('[GoalDetailsPopover] Save successful');
        stopEditing();
        // Clear form state after successful save
        setEditTitle('');
        setEditDetails('');
        setEditDueDate(undefined);
        setHasInitialized(false);
        toast({
          title: 'Success',
          description: 'Goal updated successfully',
        });
      } catch (error) {
        console.error('[GoalDetailsPopover] Failed to save goal:', error);
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
      // Don't clear form state immediately - let the useEffect handle it
    };

    return (
      <Dialog open={isEditing} onOpenChange={(open) => !open && stopEditing()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Keyboard handler needed for form submission */}
          <div className="space-y-6 py-4" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with input below */}
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter goal title..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with RichTextEditor below */}
              <label className="text-sm font-medium">Details</label>
              <RichTextEditor
                value={editDetails}
                onChange={setEditDetails}
                placeholder="Add goal details..."
              />
            </div>
            <div className="space-y-2">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
              <label className="text-sm font-medium">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editDueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDueDate
                      ? DateTime.fromJSDate(editDueDate).toFormat('LLL dd, yyyy')
                      : 'Set due date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDueDate}
                    onSelect={setEditDueDate}
                    initialFocus
                  />
                  {editDueDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setEditDueDate(undefined)}
                      >
                        Clear due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
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

        await createDailyGoalOptimistic(goal._id, trimmedTitle, selectedDayOfWeek, dateTimestamp);
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
          <h3 className="font-semibold text-lg break-words flex-1 leading-tight">{goal.title}</h3>
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
          <GoalActionMenu goal={goal} onSave={onSave} isQuarterlyGoal={isQuarterlyGoal} />
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
          Completed on {DateTime.fromMillis(goal.completedAt).toFormat('LLL d, yyyy')}
        </div>
      )}

      {/* Display due date if set */}
      {goal.dueDate && (
        <div
          className={cn(
            'text-xs flex items-center gap-2 mt-1',
            DateTime.fromMillis(goal.dueDate) < DateTime.now() && !isComplete
              ? 'text-red-600 dark:text-red-400 font-medium'
              : DateTime.fromMillis(goal.dueDate) < DateTime.now().plus({ days: 3 }) && !isComplete
                ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                : 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>
            Due: {DateTime.fromMillis(goal.dueDate).toFormat('LLL d, yyyy')}
            {DateTime.fromMillis(goal.dueDate) < DateTime.now() && !isComplete && ' (overdue)'}
          </span>
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
        ((goal.children && goal.children.length > 0) || isQuarterlyGoal || isWeeklyGoal) && (
          <>
            <Separator className="my-2" />
            <div className="pt-1 space-y-3">
              {isQuarterlyGoal && (
                <>
                  {goal.children && goal.children.length > 0 && (
                    <GoalDetailsChildrenList parentGoal={goal} title="Weekly Goals" />
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
                    <GoalDetailsChildrenList parentGoal={goal} title="Daily Goals" />
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
                            setSelectedDayOfWeek(Number.parseInt(value) as DayOfWeek)
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
            <span className={cn('break-words w-full whitespace-pre-wrap', titleClassName)}>
              {goal.title}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] max-w-[calc(100vw-32px)] p-5">
          <FireGoalsProvider>{popoverContent}</FireGoalsProvider>
        </PopoverContent>
      </Popover>
      <GoalEditModalContent onSave={onSave} />
    </GoalEditProvider>
  );
};
