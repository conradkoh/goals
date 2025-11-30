import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import type { ReactNode } from 'react';
import { GoalActionMenu } from '@/components/molecules/goal-details/GoalActionMenu';
import {
  GoalEditProvider,
  useGoalEditContext,
} from '@/components/molecules/goal-details/GoalEditContext';
import { Separator } from '@/components/ui/separator';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalHeader,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

export interface DailyGoalPopoverProps {
  /** The daily goal to display */
  goal: GoalWithDetailsAndChildren;
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
 */
export function DailyGoalPopover({
  goal,
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  additionalContent,
}: DailyGoalPopoverProps) {
  const isComplete = goal.isComplete;

  return (
    <GoalEditProvider>
      <DailyGoalPopoverContent
        goal={goal}
        onSave={onSave}
        onToggleComplete={onToggleComplete}
        triggerClassName={triggerClassName}
        titleClassName={titleClassName}
        isComplete={isComplete}
        additionalContent={additionalContent}
      />
    </GoalEditProvider>
  );
}

interface DailyGoalPopoverContentProps extends DailyGoalPopoverProps {
  isComplete: boolean;
}

function DailyGoalPopoverContent({
  goal,
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  additionalContent,
}: DailyGoalPopoverContentProps) {
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();

  return (
    <>
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
        <FireGoalsProvider>
          <GoalHeader
            title={goal.title}
            isComplete={isComplete}
            onToggleComplete={onToggleComplete}
            actionMenu={<GoalActionMenu onSave={onSave} isQuarterlyGoal={false} />}
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
      </GoalDetailsPopoverView>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
