import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import {
  GoalActionMenuNew,
  GoalChildrenSection,
  GoalCompletionDate,
  GoalDetailsChildrenList,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  useGoalEditContext,
} from '../goal-details-popover/view/components';

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';

/**
 * Props for the GoalQuickViewModal component.
 */
export interface GoalQuickViewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** The goal to display */
  goal: GoalWithDetailsAndChildren | null;
  /** Goal ID (used as fallback if goal object is not available) */
  goalId?: Id<'goals'>;
}

/**
 * Quick view modal for displaying goal details.
 * Opened from the goal search dialog (Cmd+K).
 * Shows goal details in a fullscreen modal that overlays the search dialog.
 *
 * The search dialog remains open in the background, allowing users to:
 * - Close this modal and continue searching (press Escape)
 * - Open other goals without reopening the search dialog
 * - Reference multiple goals in quick succession
 */
export function GoalQuickViewModal({ open, onOpenChange, goal, goalId }: GoalQuickViewModalProps) {
  const { handleEscapeKeyDown, handleNestedActiveChange } = useDialogEscapeHandler();

  if (!goal && !goalId) {
    return null;
  }

  // If we only have goalId, we would need to fetch the goal
  // For now, we require the full goal object
  if (!goal) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6"
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <GoalProvider goal={goal}>
          <GoalEditProvider>
            <GoalDisplayProvider>
              <GoalQuickViewContentInternal onNestedActiveChange={handleNestedActiveChange} />
            </GoalDisplayProvider>
          </GoalEditProvider>
        </GoalProvider>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Internal component that renders the goal content.
 * Separated to access contexts provided by parent.
 */
function GoalQuickViewContentInternal({
  onNestedActiveChange,
}: {
  onNestedActiveChange?: (isActive: boolean) => void;
}) {
  const { goal } = useGoalContext();
  const goalActions = useGoalActions();
  const { weekNumber, year, createWeeklyGoalOptimistic, createDailyGoalOptimistic } = useWeek();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const isComplete = goal.isComplete;

  // State for creating child goals
  const [newChildGoalTitle, setNewChildGoalTitle] = useState('');

  // For daily goals, we need day selection (default to current day)
  const currentWeekday = useMemo(() => {
    const now = DateTime.local();
    const day = now.weekday as DayOfWeek;
    return day;
  }, []);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(currentWeekday);

  // Determine goal type and whether it can have children
  const isQuarterlyGoal = goal.depth === 0;
  const isWeeklyGoal = goal.depth === 1;
  const hasChildren = goal.children && goal.children.length > 0;

  const handleSave = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await goalActions.updateQuarterlyGoalTitle({
        goalId: goal._id,
        title,
        details,
        dueDate,
      });
    },
    [goal._id, goalActions]
  );

  const handleToggleComplete = useCallback(async () => {
    await goalActions.toggleGoalCompletion({
      goalId: goal._id,
      weekNumber,
      isComplete: !isComplete,
    });
  }, [goal._id, weekNumber, isComplete, goalActions]);

  // Handler for updating goal details when task list items are toggled
  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      handleSave(goal.title, newDetails, goal.dueDate);
    },
    [goal.title, goal.dueDate, handleSave]
  );

  // Handler for creating weekly goals (from quarterly goal)
  const handleCreateWeeklyGoal = useCallback(async () => {
    const trimmedTitle = newChildGoalTitle.trim();
    if (trimmedTitle && isQuarterlyGoal) {
      try {
        setNewChildGoalTitle('');
        await createWeeklyGoalOptimistic(goal._id, trimmedTitle);
      } catch (error) {
        console.error('Failed to create weekly goal:', error);
        setNewChildGoalTitle(trimmedTitle);
      }
    }
  }, [newChildGoalTitle, goal._id, isQuarterlyGoal, createWeeklyGoalOptimistic]);

  // Handler for creating daily goals (from weekly goal)
  const handleCreateDailyGoal = useCallback(async () => {
    const trimmedTitle = newChildGoalTitle.trim();
    if (trimmedTitle && isWeeklyGoal) {
      try {
        setNewChildGoalTitle('');
        // Calculate the date timestamp for the selected day
        const dateTimestamp = DateTime.local()
          .set({ weekYear: year, weekNumber: weekNumber })
          .startOf('week')
          .plus({ days: selectedDayOfWeek - 1 })
          .toMillis();

        await createDailyGoalOptimistic(goal._id, trimmedTitle, selectedDayOfWeek, dateTimestamp);
      } catch (error) {
        console.error('Failed to create daily goal:', error);
        setNewChildGoalTitle(trimmedTitle);
      }
    }
  }, [
    newChildGoalTitle,
    goal._id,
    isWeeklyGoal,
    selectedDayOfWeek,
    weekNumber,
    year,
    createDailyGoalOptimistic,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="sr-only">{goal.title}</DialogTitle>
      </DialogHeader>
      <div className="overflow-y-auto flex-1 pr-2">
        <FireGoalsProvider>
          <GoalHeader
            title={goal.title}
            isComplete={isComplete}
            onToggleComplete={handleToggleComplete}
            statusControls={<GoalStatusIcons goalId={goal._id} />}
            actionMenu={
              <GoalActionMenuNew onSave={handleSave} isQuarterlyGoal={goal.depth === 0} />
            }
          />

          {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

          {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

          {/* Tabs for Details and Log */}
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="log">Log</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              {goal.details && (
                <GoalDetailsSection
                  title={goal.title}
                  details={goal.details}
                  onDetailsChange={handleDetailsChange}
                  showSeparator={false}
                />
              )}

              {/* Weekly Goals section for quarterly goals */}
              {isQuarterlyGoal && (
                <GoalChildrenSection
                  title="Weekly Goals"
                  childrenList={
                    hasChildren ? (
                      <GoalDetailsChildrenList parentGoal={goal} title="Weekly Goals" />
                    ) : undefined
                  }
                  createInput={
                    <CreateGoalInput
                      placeholder="Add a new weekly goal..."
                      value={newChildGoalTitle}
                      onChange={setNewChildGoalTitle}
                      onSubmit={handleCreateWeeklyGoal}
                      onEscape={() => setNewChildGoalTitle('')}
                    />
                  }
                  showSeparator={!!goal.details}
                />
              )}

              {/* Daily Goals section for weekly goals */}
              {isWeeklyGoal && (
                <GoalChildrenSection
                  title="Daily Goals"
                  childrenList={
                    hasChildren ? (
                      <GoalDetailsChildrenList parentGoal={goal} title="Daily Goals" />
                    ) : undefined
                  }
                  createInput={
                    <CreateGoalInput
                      placeholder="Add a new daily goal..."
                      value={newChildGoalTitle}
                      onChange={setNewChildGoalTitle}
                      onSubmit={handleCreateDailyGoal}
                      onEscape={() => setNewChildGoalTitle('')}
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
                  }
                  showSeparator={!!goal.details}
                />
              )}
            </TabsContent>

            <TabsContent value="log" className="mt-4">
              <GoalLogTab goalId={goal._id} onFormActiveChange={onNestedActiveChange} />
            </TabsContent>
          </Tabs>
        </FireGoalsProvider>
      </div>

      <GoalEditModal
        isOpen={isEditing}
        goal={editingGoal}
        onSave={handleSave}
        onClose={stopEditing}
      />
    </>
  );
}
