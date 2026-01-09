/**
 * Quarterly Goal Popover Content
 *
 * Renders the full quarterly goal content for use in standalone modals.
 * This is the same content as QuarterlyGoalPopover but without the trigger/popover wrapper.
 *
 * @module
 */

import { useState, useCallback } from 'react';

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
  GoalStatusIndicators,
  useGoalEditContext,
} from '../view/components';

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';

/**
 * Props for the QuarterlyGoalPopoverContent component.
 *
 * @public
 */
export interface QuarterlyGoalPopoverContentProps {
  /** Callback fired when the goal is marked as complete */
  onComplete?: () => void;
}

/**
 * Props passed to the inner content component.
 *
 * @internal
 */
interface QuarterlyGoalPopoverContentInnerProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
  /** Whether the goal is starred for this week */
  isStarred: boolean;
  /** Whether the goal is pinned for this week */
  isPinned: boolean;
  /** Whether the goal has child weekly goals */
  hasChildren: boolean;
  /** Handler for toggling starred status */
  onToggleStar: () => Promise<void>;
  /** Handler for toggling pinned status */
  onTogglePin: () => Promise<void>;
  /** Handler for toggling goal completion */
  onToggleComplete: () => Promise<void>;
  /** Handler for saving goal updates */
  onSave: (title: string, details?: string, dueDate?: number) => Promise<void>;
  /** Handler for updating goal details content */
  onDetailsChange: (newDetails: string) => void;
  /** Current value of the new weekly goal input */
  newWeeklyGoalTitle: string;
  /** Setter for the new weekly goal input */
  setNewWeeklyGoalTitle: (title: string) => void;
  /** Handler for creating a new weekly goal */
  handleCreateWeeklyGoal: () => Promise<void>;
}

/**
 * Full quarterly goal content with all interactive features.
 * Provides complete goal management including editing, completion,
 * star/pin controls, and child weekly goal operations.
 *
 * Must be used within GoalProvider and WeekProvider contexts.
 *
 * @public
 * @param props - Component props
 * @returns Rendered quarterly goal content
 */
export function QuarterlyGoalPopoverContent({ onComplete }: QuarterlyGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { weekNumber, year, quarter, createWeeklyGoalOptimistic, updateQuarterlyGoalStatus } =
    useWeek();
  const goalActions = useGoalActions();
  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');

  const isComplete = goal.isComplete;
  const isStarred = goal.state?.isStarred || false;
  const isPinned = goal.state?.isPinned || false;

  const handleToggleStar = useCallback(async () => {
    await updateQuarterlyGoalStatus({
      goalId: goal._id,
      weekNumber,
      year,
      quarter,
      isStarred: !isStarred,
      isPinned: false,
    });
  }, [goal._id, weekNumber, year, quarter, isStarred, updateQuarterlyGoalStatus]);

  const handleTogglePin = useCallback(async () => {
    await updateQuarterlyGoalStatus({
      goalId: goal._id,
      weekNumber,
      year,
      quarter,
      isStarred: false,
      isPinned: !isPinned,
    });
  }, [goal._id, weekNumber, year, quarter, isPinned, updateQuarterlyGoalStatus]);

  const handleCreateWeeklyGoal = useCallback(async () => {
    const trimmedTitle = newWeeklyGoalTitle.trim();
    if (trimmedTitle) {
      try {
        setNewWeeklyGoalTitle('');
        await createWeeklyGoalOptimistic(goal._id, trimmedTitle);
      } catch (error) {
        console.error('Failed to create weekly goal:', error);
        setNewWeeklyGoalTitle(trimmedTitle);
      }
    }
  }, [newWeeklyGoalTitle, goal._id, createWeeklyGoalOptimistic]);

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
    if (!isComplete && onComplete) {
      onComplete();
    }
  }, [goal._id, weekNumber, isComplete, goalActions, onComplete]);

  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      handleSave(goal.title, newDetails, goal.dueDate);
    },
    [goal.title, goal.dueDate, handleSave]
  );

  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <QuarterlyGoalPopoverContentInner
          isComplete={isComplete}
          isStarred={isStarred}
          isPinned={isPinned}
          hasChildren={hasChildren}
          onToggleStar={handleToggleStar}
          onTogglePin={handleTogglePin}
          onToggleComplete={handleToggleComplete}
          onSave={handleSave}
          onDetailsChange={handleDetailsChange}
          newWeeklyGoalTitle={newWeeklyGoalTitle}
          setNewWeeklyGoalTitle={setNewWeeklyGoalTitle}
          handleCreateWeeklyGoal={handleCreateWeeklyGoal}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

/**
 * Inner content component that renders the actual goal UI.
 * Separated to access GoalEditProvider and GoalDisplayProvider contexts.
 *
 * @internal
 * @param props - Component props
 * @returns Rendered goal content with edit capabilities
 */
function QuarterlyGoalPopoverContentInner({
  isComplete,
  isStarred,
  isPinned,
  hasChildren,
  onToggleStar,
  onTogglePin,
  onToggleComplete,
  onSave,
  onDetailsChange,
  newWeeklyGoalTitle,
  setNewWeeklyGoalTitle,
  handleCreateWeeklyGoal,
}: QuarterlyGoalPopoverContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { handleNestedActiveChange } = useDialogEscapeHandler();

  return (
    <>
      <FireGoalsProvider>
        <GoalHeader
          title={goal.title}
          isComplete={isComplete}
          onToggleComplete={onToggleComplete}
          statusControls={
            <GoalStarPinContainer>
              <GoalStarPin
                value={{ isStarred, isPinned }}
                onStarred={onToggleStar}
                onPinned={onTogglePin}
              />
            </GoalStarPinContainer>
          }
          actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={true} />}
        />

        <GoalStatusIndicators isStarred={isStarred} isPinned={isPinned} />

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
                onDetailsChange={onDetailsChange}
                showSeparator={false}
              />
            )}

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
                  value={newWeeklyGoalTitle}
                  onChange={setNewWeeklyGoalTitle}
                  onSubmit={handleCreateWeeklyGoal}
                  onEscape={() => setNewWeeklyGoalTitle('')}
                />
              }
              showSeparator={!!goal.details}
            />
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <GoalLogTab goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
          </TabsContent>
        </Tabs>
      </FireGoalsProvider>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
