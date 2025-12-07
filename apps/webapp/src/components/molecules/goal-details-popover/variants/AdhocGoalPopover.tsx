import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  AdhocSubGoalsList,
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

export interface AdhocGoalPopoverProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
  /** Additional class names for the trigger button */
  triggerClassName?: string;
  /** Additional class names for the title text */
  titleClassName?: string;
  /** Optional domain to display */
  domain?: Doc<'domains'> | null;
  /** Week number for the domain popover context. When provided, clicking domain shows popover. */
  weekNumber?: number;
  /** Child adhoc goals (sub-tasks) to display */
  subGoals?: AdhocGoalWithChildren[];
  /** Current nesting depth (0 = root level) */
  depth?: number;
  /** Callback when a child goal's completion status changes */
  onChildCompleteChange?: (goalId: Id<'goals'>, isComplete: boolean) => void;
  /** Callback when a child goal is updated */
  onChildUpdate?: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => void;
  /** Callback when a child goal is deleted */
  onChildDelete?: (goalId: Id<'goals'>) => void;
  /** Callback when a new child goal is created */
  onCreateChild?: (parentId: Id<'goals'>, title: string) => Promise<void>;
}

/**
 * Adhoc goal popover variant.
 * Shows adhoc goal details with domain display, due date, and nested sub-tasks.
 * Supports infinite nesting with a soft limit of 3 levels.
 * Supports both popover and fullscreen display modes.
 *
 * Must be used within a GoalProvider context.
 */
export function AdhocGoalPopover({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  domain,
  weekNumber,
  subGoals,
  depth = 0,
  onChildCompleteChange,
  onChildUpdate,
  onChildDelete,
  onCreateChild,
}: AdhocGoalPopoverProps) {
  const { goal } = useGoalContext();
  const isComplete = goal.isComplete;

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <_AdhocGoalPopoverContent
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          domain={domain}
          weekNumber={weekNumber}
          subGoals={subGoals}
          depth={depth}
          onChildCompleteChange={onChildCompleteChange}
          onChildUpdate={onChildUpdate}
          onChildDelete={onChildDelete}
          onCreateChild={onCreateChild}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

/**
 * Internal props for the content component, extending the public props.
 */
interface _AdhocGoalPopoverContentProps extends AdhocGoalPopoverProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
}

/**
 * Internal content component that renders the actual popover/dialog content.
 * Separated to access contexts that are provided by the parent component.
 */
function _AdhocGoalPopoverContent({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  domain,
  weekNumber,
  subGoals,
  depth = 0,
  onChildCompleteChange,
  onChildUpdate,
  onChildDelete,
  onCreateChild,
}: _AdhocGoalPopoverContentProps) {
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

      {domain && <GoalDomainDisplay domain={domain} weekNumber={weekNumber} />}

      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.adhoc?.dueDate && (
        <GoalDueDateDisplay dueDate={goal.adhoc.dueDate} isComplete={isComplete} />
      )}

      {goal.details && <GoalDetailsSection title={goal.title} details={goal.details} />}

      {/* Sub-tasks section */}
      {(subGoals !== undefined || onCreateChild) && (
        <AdhocSubGoalsList
          subGoals={subGoals || []}
          currentDepth={depth}
          onCompleteChange={onChildCompleteChange}
          onUpdate={onChildUpdate}
          onDelete={onChildDelete}
          onCreateChild={onCreateChild}
          parentId={goal._id}
        />
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
