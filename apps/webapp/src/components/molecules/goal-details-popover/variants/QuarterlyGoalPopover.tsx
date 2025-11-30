import { useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useWeek } from '@/hooks/useWeek';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
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
        <QuarterlyGoalPopoverContent
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

interface QuarterlyGoalPopoverContentProps extends QuarterlyGoalPopoverProps {
  isComplete: boolean;
  isStarred: boolean;
  isPinned: boolean;
  onToggleStar: () => Promise<void>;
  onTogglePin: () => Promise<void>;
  newWeeklyGoalTitle: string;
  setNewWeeklyGoalTitle: (title: string) => void;
  handleCreateWeeklyGoal: () => Promise<void>;
}

function QuarterlyGoalPopoverContent({
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
}: QuarterlyGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();

  const hasChildren = goal.children && goal.children.length > 0;

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

      {goal.details && <GoalDetailsSection title={goal.title} details={goal.details} />}

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
      />
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
