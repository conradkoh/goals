import type { Id } from '@services/backend/convex/_generated/dataModel';
import { CalendarIcon, Pin, Star, X } from 'lucide-react';
import { DateTime } from 'luxon';
import React, { useCallback, useMemo, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { DomainSelector } from '@/components/atoms/DomainSelector';
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
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useDomains } from '@/hooks/useDomains';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import { useSession } from '@/modules/auth/useSession';
import { GoalActionMenu } from './GoalActionMenu';
import { GoalDetailsChildrenList } from './GoalDetailsChildrenList';
import { GoalDetailsContent } from './GoalDetailsContent';
import { GoalEditProvider, useGoalEditContext } from './GoalEditContext';

interface GoalDetailsFullScreenModalProps {
  onSave: GoalSaveHandler;
  onToggleComplete?: GoalCompletionHandler;
  isOpen: boolean;
  onClose: () => void;
}

// Component that renders the edit modal content using context
const GoalEditModalContent: React.FC<{
  onSave: GoalSaveHandler;
}> = ({ onSave }) => {
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [editDomainId, setEditDomainId] = useState<Id<'domains'> | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();
  const { sessionId } = useSession();
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);

  const handleKeyDown = useFormSubmitShortcut({
    onSubmit: handleSave,
    shouldPreventDefault: true,
  });

  // Check if the goal is an adhoc goal (depth === -1)
  const isAdhocGoal = editingGoal?.depth === -1;

  // Initialize form data and preserve it across re-renders
  React.useEffect(() => {
    if (isEditing && editingGoal && !hasInitialized) {
      console.log('[GoalDetailsFullScreenModal] Initializing edit form:', {
        goalId: editingGoal._id,
        title: editingGoal.title,
        hasDueDate: !!editingGoal.dueDate,
        dueDate: editingGoal.dueDate,
        dueDateAsDate: editingGoal.dueDate ? new Date(editingGoal.dueDate) : undefined,
        hasDomainId: !!editingGoal.domainId,
        domainId: editingGoal.domainId,
      });
      setEditTitle(editingGoal.title);
      setEditDetails(editingGoal.details || '');
      setEditDueDate(editingGoal.dueDate ? new Date(editingGoal.dueDate) : undefined);
      setEditDomainId(editingGoal.domainId || null);
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
    console.log('[GoalDetailsFullScreenModal] Saving goal:', {
      goalId: editingGoal._id,
      title: trimmedTitle,
      hasDetails: !!editDetails,
      detailsLength: editDetails?.length,
      hasDueDate: !!editDueDate,
      dueDate: editDueDate,
      dueDateTimestamp,
      dueDateFormatted: editDueDate ? editDueDate.toISOString() : undefined,
      hasDomainId: editDomainId !== undefined,
      domainId: editDomainId,
    });

    setIsSubmitting(true);
    try {
      await onSave(trimmedTitle, editDetails, dueDateTimestamp, editDomainId);
      console.log('[GoalDetailsFullScreenModal] Save successful');
      stopEditing();
      // Clear form state after successful save
      setEditTitle('');
      setEditDetails('');
      setEditDueDate(undefined);
      setEditDomainId(undefined);
      setHasInitialized(false);
      toast({
        title: 'Success',
        description: 'Goal updated successfully',
      });
    } catch (error) {
      console.error('[GoalDetailsFullScreenModal] Failed to save goal:', error);
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
          {isAdhocGoal && (
            <div className="space-y-2">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with DomainSelector below */}
              <label className="text-sm font-medium">Domain</label>
              <DomainSelector
                domains={domains}
                selectedDomainId={editDomainId === null ? null : editDomainId}
                onDomainChange={(domainId) => setEditDomainId(domainId as Id<'domains'> | null)}
                onDomainCreate={async (name, description, color) => {
                  const newDomainId = await createDomain(name, description, color);
                  setEditDomainId(newDomainId);
                }}
                onDomainUpdate={async (domainId, name, description, color) => {
                  await updateDomain(domainId, { name, description, color });
                }}
                onDomainDelete={deleteDomain}
                allowCreate={true}
                allowEdit={true}
                placeholder="Select a domain..."
                className="w-full"
              />
            </div>
          )}
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

export const GoalDetailsFullScreenModal: React.FC<GoalDetailsFullScreenModalProps> = ({
  onSave,
  onToggleComplete,
  isOpen,
  onClose,
}) => {
  const { goal } = useGoalContext();

  console.log('[GoalDetailsFullScreenModal] Rendering with goal:', {
    goalId: goal._id,
    title: goal.title,
    depth: goal.depth,
    hasDueDate: !!goal.dueDate,
    dueDate: goal.dueDate,
    dueDateFormatted: goal.dueDate ? new Date(goal.dueDate).toISOString() : undefined,
    isOpen,
  });

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
  const [currentDueDate, setCurrentDueDate] = useState<number | undefined>(goal.dueDate);

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

  // Handle inline due date change from the details view (no edit modal)
  const handleInlineDueDateChange = useCallback(
    async (date: Date | undefined) => {
      try {
        const dueDateMillis = date ? date.getTime() : undefined;
        await onSave(goal.title, goal.details ?? '', dueDateMillis);
        setCurrentDueDate(dueDateMillis);
      } catch (error) {
        console.error('[GoalDetailsFullScreenModal] Failed to update due date inline:', error);
      }
    },
    [onSave, goal.title, goal.details]
  );

  const modalContent = (
    <div className="space-y-6">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Goal Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Goal header with completion and actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Checkbox
            className="flex-shrink-0"
            checked={isComplete}
            disabled={!onToggleComplete}
            onCheckedChange={(checked) => onToggleComplete?.(checked === true)}
          />
          <h3 className="font-semibold text-xl break-words flex-1 leading-tight">{goal.title}</h3>
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
          <GoalActionMenu onSave={onSave} isQuarterlyGoal={isQuarterlyGoal} />
        </div>
      </div>

      {/* Status indicators */}
      {isQuarterlyGoal && (isStarred || isPinned) && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {isStarred && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Starred</span>
            </div>
          )}
          {isPinned && (
            <div className="flex items-center gap-1">
              <Pin className="h-4 w-4 fill-blue-400 text-blue-400" />
              <span>Pinned</span>
            </div>
          )}
        </div>
      )}

      {/* Display completion date if the goal is complete */}
      {isComplete && goal.completedAt && (
        <div className="text-sm text-muted-foreground">
          Completed on {DateTime.fromMillis(goal.completedAt).toFormat('LLL d, yyyy')}
        </div>
      )}

      {/* Inline due date editor */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
        <label className="text-sm font-medium text-muted-foreground">Due Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !currentDueDate && 'text-muted-foreground',
                currentDueDate &&
                  (DateTime.fromMillis(currentDueDate).startOf('day') <
                    DateTime.now().startOf('day') && !isComplete
                    ? 'text-purple-700 dark:text-purple-500 font-medium'
                    : DateTime.fromMillis(currentDueDate)
                          .startOf('day')
                          .equals(DateTime.now().startOf('day')) && !isComplete
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : DateTime.fromMillis(currentDueDate).startOf('day') <
                            DateTime.now().startOf('day').plus({ days: 3 }) && !isComplete
                        ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                        : 'text-foreground')
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {currentDueDate
                ? DateTime.fromMillis(currentDueDate).toFormat('LLL d, yyyy')
                : 'Set due date...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDueDate ? new Date(currentDueDate) : undefined}
              onSelect={(date) => handleInlineDueDateChange(date)}
              initialFocus
            />
            {currentDueDate && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleInlineDueDateChange(undefined)}
                >
                  Clear due date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Goal details */}
      {goal.details && (
        <>
          <Separator className="my-4" />
          <div className="pt-2">
            <GoalDetailsContent title={goal.title} details={goal.details} />
          </div>
        </>
      )}

      {/* Child goals section */}
      {shouldShowChildGoals &&
        goal &&
        ((goal.children && goal.children.length > 0) || isQuarterlyGoal || isWeeklyGoal) && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              {/* Weekly goals for quarterly goals */}
              {isQuarterlyGoal && (
                <>
                  {goal.children && goal.children.length > 0 && (
                    <GoalDetailsChildrenList parentGoal={goal} title="Weekly Goals" />
                  )}
                  <div className="pl-4 pt-2">
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

              {/* Daily goals for weekly goals */}
              {isWeeklyGoal && (
                <>
                  {goal.children && goal.children.length > 0 && (
                    <GoalDetailsChildrenList parentGoal={goal} title="Daily Goals" />
                  )}
                  <div className="pl-4 pt-2">
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Goal Details</DialogTitle>
          </DialogHeader>
          <FireGoalsProvider>{modalContent}</FireGoalsProvider>
        </DialogContent>
      </Dialog>
      <GoalEditModalContent onSave={onSave} />
    </GoalEditProvider>
  );
};
