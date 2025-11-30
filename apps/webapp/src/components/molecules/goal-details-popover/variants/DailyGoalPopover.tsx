import type { ReactNode } from 'react';
import {
  GoalEditProvider,
  useGoalEditContext,
} from '@/components/molecules/goal-details/GoalEditContext';
import { Separator } from '@/components/ui/separator';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  GoalActionMenuNew,
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalHeader,
  useGoalDisplayContext,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

export interface DailyGoalPopoverProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
  /** Additional class names for the trigger button */
  triggerClassName?: string;
  /** Additional class names for the title text */
  titleClassName?: string;
  /** Additional content to render (e.g., day selector) */
  additionalContent?: ReactNode;
}

/**
 * Daily goal popover variant.
 * Shows goal details and optional additional content like day selection.
 * Daily goals don't have children.
 * Supports both popover and fullscreen display modes.
 *
 * Must be used within a GoalProvider context.
 */
export function DailyGoalPopover({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  additionalContent,
}: DailyGoalPopoverProps) {
  const { goal } = useGoalContext();
  const isComplete = goal.isComplete;

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <DailyGoalPopoverContent
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          additionalContent={additionalContent}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

interface DailyGoalPopoverContentProps extends DailyGoalPopoverProps {
  isComplete: boolean;
}

function DailyGoalPopoverContent({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  additionalContent,
}: DailyGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();

  // Shared content for both popover and fullscreen modes
  const goalContent = (
    <FireGoalsProvider>
      <GoalHeader
        title={goal.title}
        isComplete={isComplete}
        onToggleComplete={onToggleComplete}
        actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={false} />}
      />

      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

      {goal.details && <GoalDetailsSection title={goal.title} details={goal.details} />}

      {additionalContent && (
        <>
          <Separator className="my-2" />
          <div className="pt-1">{additionalContent}</div>
        </>
      )}
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
