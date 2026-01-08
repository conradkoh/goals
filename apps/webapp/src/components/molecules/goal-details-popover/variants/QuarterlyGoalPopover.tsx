import { useState } from 'react';

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
  useGoalDisplayContext,
  useGoalEditContext,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useWeek } from '@/hooks/useWeek';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';

export interface QuarterlyGoalPopoverProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
  /** Additional class names for the trigger button */
  triggerClassName?: string;
  /** Additional class names for the title text */
  titleClassName?: string;
}

/**
 * Quarterly goal popover variant.
 * Shows star/pin controls, weekly goals children, and ability to create weekly goals.
 * Supports both popover and fullscreen display modes.
 *
 * Must be used within a GoalProvider context.
 */
export function QuarterlyGoalPopover({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
}: QuarterlyGoalPopoverProps) {
  const { goal } = useGoalContext();
  const { weekNumber, year, quarter, createWeeklyGoalOptimistic, updateQuarterlyGoalStatus } =
    useWeek();
  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');

  const isComplete = goal.isComplete;
  const isStarred = goal.state?.isStarred || false;
  const isPinned = goal.state?.isPinned || false;

  const handleToggleStar = async () => {
    await updateQuarterlyGoalStatus({
      goalId: goal._id,
      weekNumber,
      year,
      quarter,
      isStarred: !isStarred,
      isPinned: false,
    });
  };

  const handleTogglePin = async () => {
    await updateQuarterlyGoalStatus({
      goalId: goal._id,
      weekNumber,
      year,
      quarter,
      isStarred: false,
      isPinned: !isPinned,
    });
  };

  const handleCreateWeeklyGoal = async () => {
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
  };

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <QuarterlyGoalPopoverContentInner
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          isStarred={isStarred}
          isPinned={isPinned}
          onToggleStar={handleToggleStar}
          onTogglePin={handleTogglePin}
          newWeeklyGoalTitle={newWeeklyGoalTitle}
          setNewWeeklyGoalTitle={setNewWeeklyGoalTitle}
          handleCreateWeeklyGoal={handleCreateWeeklyGoal}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

/**
 * Internal props for the quarterly goal content component.
 */
interface QuarterlyGoalPopoverContentInnerProps extends QuarterlyGoalPopoverProps {
  /** Whether the goal is marked as complete */
  isComplete: boolean;
  /** Whether the goal is starred for this week */
  isStarred: boolean;
  /** Whether the goal is pinned for this week */
  isPinned: boolean;
  /** Handler for toggling starred status */
  onToggleStar: () => Promise<void>;
  /** Handler for toggling pinned status */
  onTogglePin: () => Promise<void>;
  /** Current value of the new weekly goal input */
  newWeeklyGoalTitle: string;
  /** Setter for the new weekly goal input value */
  setNewWeeklyGoalTitle: (title: string) => void;
  /** Handler for creating a new weekly goal */
  handleCreateWeeklyGoal: () => Promise<void>;
}

/**
 * Internal content component for quarterly goal popover.
 * Separated to access contexts provided by parent.
 */
function QuarterlyGoalPopoverContentInner({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  isStarred,
  isPinned,
  onToggleStar,
  onTogglePin,
  newWeeklyGoalTitle,
  setNewWeeklyGoalTitle,
  handleCreateWeeklyGoal,
}: QuarterlyGoalPopoverContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();

  const hasChildren = goal.children && goal.children.length > 0;

  // Handler for updating goal details when task list items are toggled
  const handleDetailsChange = (newDetails: string) => {
    onSave(goal.title, newDetails, goal.dueDate);
  };

  // Shared content for both popover and fullscreen modes
  const goalContent = (
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
              onDetailsChange={handleDetailsChange}
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
          <GoalLogTab goalId={goal._id} />
        </TabsContent>
      </Tabs>
    </FireGoalsProvider>
  );

  return (
    <>
      {/* Popover mode */}
      <GoalDetailsPopoverView
        popoverKey={goal._id.toString()}
        trigger={
          <GoalPopoverTrigger
            title={goal.title}
            className={triggerClassName}
            titleClassName={titleClassName}
          />
        }
      >
        {goalContent}
      </GoalDetailsPopoverView>

      {/* Fullscreen mode */}
      <GoalDetailsPopoverView
        popoverKey={`${goal._id.toString()}-fullscreen`}
        trigger={<span />}
        fullScreen
        open={isFullScreenOpen}
        onOpenChange={(open) => !open && closeFullScreen()}
      >
        {goalContent}
      </GoalDetailsPopoverView>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
