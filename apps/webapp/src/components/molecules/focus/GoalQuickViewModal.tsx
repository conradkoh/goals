import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useCallback } from 'react';
import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import {
  GoalActionMenuNew,
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  useGoalEditContext,
} from '../goal-details-popover/view/components';

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
      <DialogContent className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <GoalProvider goal={goal}>
          <GoalEditProvider>
            <GoalDisplayProvider>
              <_GoalQuickViewContent />
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
function _GoalQuickViewContent() {
  const { goal } = useGoalContext();
  const goalActions = useGoalActions();
  const { weekNumber } = useWeek();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const isComplete = goal.isComplete;

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

          {goal.details && (
            <>
              <Separator className="my-4" />
              <GoalDetailsSection
                title={goal.title}
                details={goal.details}
                onDetailsChange={handleDetailsChange}
              />
            </>
          )}
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
