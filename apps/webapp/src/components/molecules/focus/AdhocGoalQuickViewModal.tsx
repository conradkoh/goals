import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useCallback, useMemo } from 'react';

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
} from '../goal-details-popover/view/components';

import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the AdhocGoalQuickViewModal component.
 *
 * @public
 *
 * @example
 * ```tsx
 * const [selectedGoal, setSelectedGoal] = useState<AdhocGoalWithChildren | null>(null);
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <AdhocGoalQuickViewModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   goal={selectedGoal}
 *   year={2025}
 *   weekNumber={48}
 * />
 * ```
 */
export interface AdhocGoalQuickViewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** The adhoc goal to display, or null if no goal is selected */
  goal: AdhocGoalWithChildren | null;
  /** Year for context (used when creating child goals) */
  year: number;
  /** Week number for context (used when creating child goals) */
  weekNumber: number;
}

/**
 * Quick view modal for displaying adhoc goal details.
 * Opened from the goal search dialog (Cmd+K) when an adhoc goal is selected.
 *
 * This component provides a focused view of an adhoc goal and its hierarchy:
 * - Shows goal title, completion status, domain, and due date
 * - Displays goal details with interactive task lists (checkboxes are clickable)
 * - Renders nested sub-tasks up to 3 levels deep
 * - Supports full CRUD operations on sub-tasks (create, update, delete, toggle complete)
 *
 * The modal works alongside the search dialog:
 * - Search dialog remains open in the background
 * - Press Escape to close modal and return to search
 * - Allows quick navigation between multiple goals
 *
 * @public
 *
 * @example
 * ```tsx
 * function GoalSearchView() {
 *   const [isModalOpen, setIsModalOpen] = useState(false);
 *   const [selectedGoal, setSelectedGoal] = useState<AdhocGoalWithChildren | null>(null);
 *
 *   const handleGoalSelect = (goal: AdhocGoalWithChildren) => {
 *     setSelectedGoal(goal);
 *     setIsModalOpen(true);
 *   };
 *
 *   return (
 *     <>
 *       <GoalSearchDialog onAdhocGoalSelect={handleGoalSelect} />
 *       <AdhocGoalQuickViewModal
 *         open={isModalOpen}
 *         onOpenChange={setIsModalOpen}
 *         goal={selectedGoal}
 *         year={currentYear}
 *         weekNumber={currentWeek}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function AdhocGoalQuickViewModal({
  open,
  onOpenChange,
  goal,
  year,
  weekNumber,
}: AdhocGoalQuickViewModalProps) {
  const { handleEscapeKeyDown, handleNestedActiveChange } = useDialogEscapeHandler();

  /**
   * Converts AdhocGoalWithChildren to GoalWithDetailsAndChildren format.
   * This conversion is necessary for compatibility with GoalProvider context.
   *
   * The conversion:
   * - Recursively processes all child goals
   * - Sets empty path strings (adhoc goals don't use hierarchical paths)
   * - Preserves all other goal properties unchanged
   *
   * @internal
   */
  const goalAsStandardFormat = useMemo((): GoalWithDetailsAndChildren | null => {
    if (!goal) return null;

    /**
     * Recursively converts child adhoc goals to standard format.
     * @internal
     */
    const convertChildren = (children: AdhocGoalWithChildren[]): GoalWithDetailsAndChildren[] => {
      return children.map((child) => ({
        ...child,
        path: '', // Adhoc goals don't use hierarchical paths
        children: convertChildren(child.children || []),
      }));
    };

    return {
      ...goal,
      path: '', // Adhoc goals don't use hierarchical paths
      children: convertChildren(goal.children || []),
    };
  }, [goal]);

  if (!goalAsStandardFormat || !goal) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6"
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <GoalProvider goal={goalAsStandardFormat}>
          <GoalEditProvider>
            <GoalDisplayProvider>
              <AdhocGoalQuickViewContent
                goal={goal}
                year={year}
                weekNumber={weekNumber}
                onNestedActiveChange={handleNestedActiveChange}
              />
            </GoalDisplayProvider>
          </GoalEditProvider>
        </GoalProvider>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Internal component that renders the adhoc goal content within provider contexts.
 * Separated from parent to access GoalContext, GoalEditContext, and GoalDisplayContext.
 *
 * This component handles all interactive functionality:
 * - Goal title and details editing
 * - Completion status toggling
 * - Task list checkbox interactions
 * - Child goal CRUD operations (create, update, delete, toggle)
 * - Domain and due date display
 *
 * @internal
 */
function AdhocGoalQuickViewContent({
  goal: adhocGoalProp,
  year,
  weekNumber,
  onNestedActiveChange,
}: {
  goal: AdhocGoalWithChildren;
  year: number;
  weekNumber: number;
  onNestedActiveChange?: (isActive: boolean) => void;
}) {
  const { goal } = useGoalContext();
  const { sessionId } = useSession();
  const { updateAdhocGoal, deleteAdhocGoal, createAdhocGoal } = useAdhocGoals(sessionId);
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const isComplete = goal.isComplete;

  /**
   * Saves updates to the adhoc goal.
   * @internal
   */
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

  /**
   * Toggles the completion status of the main adhoc goal.
   * @internal
   */
  const handleToggleComplete = useCallback(async () => {
    await updateAdhocGoal(goal._id, {
      isComplete: !isComplete,
    });
  }, [goal._id, isComplete, updateAdhocGoal]);

  /**
   * Toggles the backlog status of the main adhoc goal.
   * @internal
   */
  const handleToggleBacklog = useCallback(
    async (newIsBacklog: boolean) => {
      await updateAdhocGoal(goal._id, {
        isBacklog: newIsBacklog,
      });
    },
    [goal._id, updateAdhocGoal]
  );

  /**
   * Updates goal details when task list checkboxes are toggled.
   * @internal
   */
  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      handleSave(goal.title, newDetails, goal.adhoc?.dueDate, goal.domainId);
    },
    [goal.title, goal.adhoc?.dueDate, goal.domainId, handleSave]
  );

  /**
   * Toggles completion status for a child adhoc goal.
   * @internal
   */
  const handleChildCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      await updateAdhocGoal(goalId, { isComplete });
    },
    [updateAdhocGoal]
  );

  /**
   * Updates a child adhoc goal's properties.
   * @internal
   */
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

  /**
   * Deletes a child adhoc goal.
   * @internal
   */
  const handleChildDelete = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteAdhocGoal(goalId);
    },
    [deleteAdhocGoal]
  );

  /**
   * Creates a new child adhoc goal under the specified parent.
   * Inherits domain from the parent goal.
   * @internal
   */
  const handleCreateChild = useCallback(
    async (parentId: Id<'goals'>, title: string) => {
      await createAdhocGoal(
        title,
        undefined, // details
        adhocGoalProp.domainId, // inherit domain from parent
        year,
        weekNumber,
        undefined, // dayOfWeek
        undefined, // dueDate
        parentId
      );
    },
    [createAdhocGoal, adhocGoalProp.domainId, year, weekNumber]
  );

  /**
   * Current depth in the goal hierarchy.
   * Set to 0 since we display from the top-level adhoc goal.
   * @internal
   */
  const currentDepth = 0;

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
              <GoalActionMenuNew
                onSave={handleSave}
                isQuarterlyGoal={false}
                isAdhocGoal={true}
                isBacklog={adhocGoalProp.isBacklog || false}
                onToggleBacklog={handleToggleBacklog}
              />
            }
          />

          {adhocGoalProp.domain && (
            <GoalDomainDisplay domain={adhocGoalProp.domain} weekNumber={weekNumber} />
          )}

          {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

          {goal.adhoc?.dueDate && (
            <GoalDueDateDisplay dueDate={goal.adhoc.dueDate} isComplete={isComplete} />
          )}

          {/* Tabs for Details and Log */}
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="log">Log</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              {goal.details && (
                <>
                  <GoalDetailsSection
                    title={goal.title}
                    details={goal.details}
                    onDetailsChange={handleDetailsChange}
                    showSeparator={false}
                  />
                  <Separator className="my-4" />
                </>
              )}

              {/* Sub-tasks section */}
              <AdhocSubGoalsList
                subGoals={adhocGoalProp.children || []}
                currentDepth={currentDepth}
                onCompleteChange={handleChildCompleteChange}
                onUpdate={handleChildUpdate}
                onDelete={handleChildDelete}
                onCreateChild={handleCreateChild}
                parentId={goal._id}
              />
            </TabsContent>

            <TabsContent value="log" className="mt-4">
              <GoalLogTab goalId={goal._id} onFormActiveChange={onNestedActiveChange} />
            </TabsContent>
          </Tabs>
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
