/**
 * Adhoc Goal Popover Content
 *
 * Renders the full adhoc goal content for use in standalone modals.
 * This is the same content as AdhocGoalPopover but without the trigger/popover wrapper.
 *
 * @module
 */

import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { useCallback } from 'react';

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
  useGoalEditContext,
} from '../view/components';

import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the AdhocGoalPopoverContent component.
 *
 * @public
 */
export interface AdhocGoalPopoverContentProps {
  /** Callback fired when the goal is marked as complete */
  onComplete?: () => void;
  /** Week number for domain popover context */
  weekNumber?: number;
}

/**
 * Props passed to the inner content component.
 *
 * @internal
 */
interface AdhocGoalPopoverContentInnerProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
  /** Whether the goal is in backlog */
  isBacklog: boolean;
  /** Domain associated with the goal, if any */
  domain: Doc<'domains'> | null;
  /** Week number for domain popover context */
  weekNumber?: number;
  /** Child sub-goals under this adhoc goal */
  subGoals: AdhocGoalWithChildren[];
  /** Handler for toggling goal completion status */
  onToggleComplete: () => Promise<void>;
  /** Handler for toggling backlog status */
  onToggleBacklog: (isBacklog: boolean) => Promise<void>;
  /** Handler for saving goal updates */
  onSave: (
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  /** Handler for updating goal details content */
  onDetailsChange: (newDetails: string) => void;
  /** Handler for toggling child goal completion */
  onChildCompleteChange: (goalId: Id<'goals'>, isComplete: boolean) => Promise<void>;
  /** Handler for updating a child goal */
  onChildUpdate: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  /** Handler for deleting a child goal */
  onChildDelete: (goalId: Id<'goals'>) => Promise<void>;
  /** Handler for creating a new child goal */
  onCreateChild: (parentId: Id<'goals'>, title: string) => Promise<void>;
}

/**
 * Full adhoc goal content with all interactive features.
 * Provides complete goal management including editing, completion,
 * and child goal operations.
 *
 * Must be used within GoalProvider context.
 *
 * @public
 * @param props - Component props
 * @returns Rendered adhoc goal content
 */
export function AdhocGoalPopoverContent({ onComplete, weekNumber }: AdhocGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { sessionId } = useSession();
  const { updateAdhocGoal, deleteAdhocGoal, createAdhocGoal } = useAdhocGoals(sessionId);

  const isComplete = goal.isComplete;

  const handleSave = useCallback(
    async (title: string, details?: string, dueDate?: number, domainId?: Id<'domains'> | null) => {
      await updateAdhocGoal(goal._id, {
        title,
        details,
        dueDate,
        domainId: domainId === null ? null : domainId,
      });
    },
    [goal._id, updateAdhocGoal]
  );

  const handleToggleComplete = useCallback(async () => {
    await updateAdhocGoal(goal._id, {
      isComplete: !isComplete,
    });
    if (!isComplete && onComplete) {
      onComplete();
    }
  }, [goal._id, isComplete, updateAdhocGoal, onComplete]);

  const handleToggleBacklog = useCallback(
    async (newIsBacklog: boolean) => {
      await updateAdhocGoal(goal._id, {
        isBacklog: newIsBacklog,
      });
    },
    [goal._id, updateAdhocGoal]
  );

  const isBacklog = (goal as unknown as { isBacklog?: boolean }).isBacklog || false;

  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      handleSave(goal.title, newDetails, goal.adhoc?.dueDate, goal.domainId);
    },
    [goal.title, goal.adhoc?.dueDate, goal.domainId, handleSave]
  );

  const handleChildCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      await updateAdhocGoal(goalId, { isComplete });
    },
    [updateAdhocGoal]
  );

  const handleChildUpdate = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      await updateAdhocGoal(goalId, { title, details, dueDate, domainId });
    },
    [updateAdhocGoal]
  );

  const handleChildDelete = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteAdhocGoal(goalId);
    },
    [deleteAdhocGoal]
  );

  const handleCreateChild = useCallback(
    async (parentId: Id<'goals'>, title: string) => {
      await createAdhocGoal(
        title,
        undefined,
        goal.domainId ?? undefined,
        goal.year,
        goal.adhoc?.weekNumber || weekNumber || 1,
        undefined,
        undefined,
        parentId
      );
    },
    [createAdhocGoal, goal.year, goal.adhoc?.weekNumber, goal.domainId, weekNumber]
  );

  // Get domain from goal if available (comes from getGoalDetails query)
  const domain = (goal as unknown as { domain?: Doc<'domains'> }).domain ?? null;
  // Get sub-goals from goal.children if available
  const subGoals = (goal as unknown as { children?: AdhocGoalWithChildren[] }).children ?? [];

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <AdhocGoalPopoverContentInner
          isComplete={isComplete}
          isBacklog={isBacklog}
          domain={domain}
          weekNumber={weekNumber}
          subGoals={subGoals}
          onToggleComplete={handleToggleComplete}
          onToggleBacklog={handleToggleBacklog}
          onSave={handleSave}
          onDetailsChange={handleDetailsChange}
          onChildCompleteChange={handleChildCompleteChange}
          onChildUpdate={handleChildUpdate}
          onChildDelete={handleChildDelete}
          onCreateChild={handleCreateChild}
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
function AdhocGoalPopoverContentInner({
  isComplete,
  isBacklog,
  domain,
  weekNumber,
  subGoals,
  onToggleComplete,
  onToggleBacklog,
  onSave,
  onDetailsChange,
  onChildCompleteChange,
  onChildUpdate,
  onChildDelete,
  onCreateChild,
}: AdhocGoalPopoverContentInnerProps) {
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
          actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={false} />}
          statusControls={
            <GoalStatusIcons
              goalId={goal._id}
              showBacklog
              isBacklog={isBacklog}
              onToggleBacklog={onToggleBacklog}
            />
          }
        />

        {domain && <GoalDomainDisplay domain={domain} weekNumber={weekNumber} />}

        {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

        {goal.adhoc?.dueDate && (
          <GoalDueDateDisplay dueDate={goal.adhoc.dueDate} isComplete={isComplete} />
        )}

        {/* Tabs for Details and Log */}
        {/* flex-1 min-h-0 ensures Tabs takes remaining height and can shrink for Log tab scrolling */}
        <Tabs defaultValue="details" className="mt-4 flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
          </TabsList>

          {/* overflow-y-auto allows Details content to scroll if it overflows */}
          <TabsContent value="details" className="mt-4 overflow-y-auto">
            {goal.details && (
              <GoalDetailsSection
                title={goal.title}
                details={goal.details}
                onDetailsChange={onDetailsChange}
                showSeparator={false}
              />
            )}

            <AdhocSubGoalsList
              subGoals={subGoals}
              currentDepth={0}
              onCompleteChange={onChildCompleteChange}
              onUpdate={onChildUpdate}
              onDelete={onChildDelete}
              onCreateChild={onCreateChild}
              parentId={goal._id}
            />
          </TabsContent>

          {/* flex flex-col passes height constraint to GoalLogTab for internal scrolling */}
          <TabsContent value="log" className="mt-4 flex flex-col">
            <GoalLogTab goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
          </TabsContent>
        </Tabs>
      </FireGoalsProvider>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
