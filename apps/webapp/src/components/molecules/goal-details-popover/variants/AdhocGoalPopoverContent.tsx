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
  GoalBreadcrumb,
  GoalCompletionDate,
  GoalCreatedDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDomainDisplay,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  GoalInitiativeField,
  useGoalEditContext,
} from '../view/components';

import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { GoalType } from '@/domain/goal-actions';
import { buildAdhocGoalMutationArgs } from '@/domain/goal-updates';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useAdhocGoalDetailsSave } from '@/hooks/useGoalDetailsSave';
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
    domainId?: Id<'domains'> | null,
    initiativeId?: Id<'initiatives'> | null
  ) => Promise<void>;
  /** Handler for deleting a child goal */
  onChildDelete: (goalId: Id<'goals'>) => Promise<void>;
  /** Handler for creating a new child goal */
  onCreateChild: (parentId: Id<'goals'>, title: string) => Promise<void>;
  /** Handler for updating initiative tag */
  onInitiativeChange: (initiativeId: Id<'initiatives'> | null) => Promise<void>;
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
// fallow-ignore-next-line complexity
export function AdhocGoalPopoverContent({ onComplete, weekNumber }: AdhocGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { sessionId } = useSession();
  const { updateAdhocGoal, deleteAdhocGoal, createAdhocGoal } = useAdhocGoals(sessionId);

  const isComplete = goal.isComplete;

  const handleSave = useCallback(
    async (
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null,
      initiativeId?: Id<'initiatives'> | null
    ) => {
      await updateAdhocGoal(
        goal._id,
        buildAdhocGoalMutationArgs({ title, details, dueDate, domainId, initiativeId })
      );
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

  const handleDetailsChange = useAdhocGoalDetailsSave(goal._id, updateAdhocGoal);

  const handleInitiativeChange = useCallback(
    async (initiativeId: Id<'initiatives'> | null) => {
      await updateAdhocGoal(
        goal._id,
        buildAdhocGoalMutationArgs({
          title: goal.title,
          details: goal.details,
          dueDate: goal.adhoc?.dueDate,
          domainId: goal.domainId ?? null,
          initiativeId,
        })
      );
    },
    [goal._id, goal.title, goal.details, goal.adhoc?.dueDate, goal.domainId, updateAdhocGoal]
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
      domainId?: Id<'domains'> | null,
      initiativeId?: Id<'initiatives'> | null
    ) => {
      await updateAdhocGoal(
        goalId,
        buildAdhocGoalMutationArgs({ title, details, dueDate, domainId, initiativeId })
      );
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
          onInitiativeChange={handleInitiativeChange}
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
  onInitiativeChange,
}: AdhocGoalPopoverContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { handleNestedActiveChange } = useDialogEscapeHandler();

  return (
    <>
      <FireGoalsProvider>
        <GoalBreadcrumb domain={domain} />
        <GoalHeader
          title={goal.title}
          isComplete={isComplete}
          onToggleComplete={onToggleComplete}
          actionMenu={
            <GoalActionMenuNew
              onSave={onSave}
              goalType={GoalType.Adhoc}
              isBacklog={isBacklog}
              onToggleBacklog={onToggleBacklog}
            />
          }
          statusControls={<GoalStatusIcons goalId={goal._id} />}
        />

        {domain && <GoalDomainDisplay domain={domain} weekNumber={weekNumber} />}

        <GoalInitiativeField
          selectedInitiativeId={goal.initiativeId ?? null}
          onInitiativeChange={onInitiativeChange}
          className="mt-3 space-y-2"
        />

        <GoalCreatedDate createdAt={goal._creationTime} />
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
