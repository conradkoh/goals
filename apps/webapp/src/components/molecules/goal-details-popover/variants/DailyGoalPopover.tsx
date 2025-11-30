import type { Doc } from '@services/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  GoalActionMenuNew,
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDomainDisplay,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  useGoalDisplayContext,
  useGoalEditContext,
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
  /** Optional domain to display */
  domain?: Doc<'domains'> | null;
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
  domain,
}: DailyGoalPopoverProps) {
  const { goal } = useGoalContext();
  const isComplete = goal.isComplete;

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <_DailyGoalPopoverContent
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          additionalContent={additionalContent}
          domain={domain}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

/**
 * Internal props for the content component, extending the public props.
 */
interface _DailyGoalPopoverContentProps extends DailyGoalPopoverProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
}

/**
 * Internal content component that renders the actual popover/dialog content.
 * Separated to access contexts that are provided by the parent component.
 */
function _DailyGoalPopoverContent({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  additionalContent,
  domain,
}: _DailyGoalPopoverContentProps) {
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

      {domain && <GoalDomainDisplay domain={domain} />}

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
