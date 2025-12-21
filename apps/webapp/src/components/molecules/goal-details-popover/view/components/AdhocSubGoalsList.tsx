import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { Edit2, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { CreateInputView } from '@/components/atoms/CreateInput';
import { FireIcon } from '@/components/atoms/FireIcon';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { AdhocGoalPopover } from '@/components/molecules/goal-details-popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { GoalProvider } from '@/contexts/GoalContext';
import { cn } from '@/lib/utils';

/**
 * Maximum nesting depth for adhoc goals (soft limit).
 */
const MAX_ADHOC_GOAL_DEPTH = 3;

/**
 * Sub-goal with optimistic update tracking.
 */
type _OptimisticSubGoal = AdhocGoalWithChildren & {
  isOptimistic?: boolean;
};

export interface AdhocSubGoalsListProps {
  /** Child adhoc goals to display */
  subGoals: AdhocGoalWithChildren[];
  /** Current nesting depth (0 = root level) */
  currentDepth: number;
  /** Callback when a child goal's completion status changes */
  onCompleteChange?: (goalId: Id<'goals'>, isComplete: boolean) => void;
  /** Callback when a goal is updated */
  onUpdate?: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => void;
  /** Callback when a goal is deleted */
  onDelete?: (goalId: Id<'goals'>) => void;
  /** Callback when a new child goal is created */
  onCreateChild?: (parentId: Id<'goals'>, title: string) => Promise<void>;
  /** Parent goal ID for creating new children */
  parentId: Id<'goals'>;
}

/**
 * Displays a list of adhoc sub-goals within the goal details popover.
 * Supports displaying nested children and creating new sub-goals.
 * Uses optimistic updates for immediate feedback.
 */
export function AdhocSubGoalsList({
  subGoals,
  currentDepth,
  onCompleteChange,
  onUpdate,
  onDelete,
  onCreateChild,
  parentId,
}: AdhocSubGoalsListProps) {
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
  const [optimisticSubGoals, setOptimisticSubGoals] = useState<_OptimisticSubGoal[]>([]);

  /** Whether the current depth allows adding more sub-goals. */
  const canAddSubGoal = currentDepth < MAX_ADHOC_GOAL_DEPTH && onCreateChild;
  /** Whether we've reached the maximum nesting depth. */
  const isAtMaxDepth = currentDepth >= MAX_ADHOC_GOAL_DEPTH;

  /** Combined list of real and optimistic sub-goals for display. Sorted by creation time (oldest first). */
  const allSubGoals: _OptimisticSubGoal[] = [...subGoals, ...optimisticSubGoals].sort(
    (a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0)
  );

  /** Creates a new sub-goal with optimistic UI update. */
  const handleCreateSubGoal = useCallback(async () => {
    if (!newSubGoalTitle.trim() || !onCreateChild) return;

    const title = newSubGoalTitle.trim();
    const tempId = `temp-${Date.now()}` as Id<'goals'>;

    // Create optimistic sub-goal
    const optimisticGoal: _OptimisticSubGoal = {
      _id: tempId,
      _creationTime: Date.now(),
      userId: '' as Id<'users'>,
      year: new Date().getFullYear(),
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      title,
      inPath: '/',
      depth: -1,
      isComplete: false,
      isOptimistic: true,
      parentId,
      children: [],
    };

    // Add optimistic goal immediately
    setOptimisticSubGoals((prev) => [...prev, optimisticGoal]);
    setNewSubGoalTitle('');

    try {
      await onCreateChild(parentId, title);
      // Remove optimistic goal after successful creation (real goal will appear from query)
      setOptimisticSubGoals((prev) => prev.filter((g) => g._id !== tempId));
    } catch (error) {
      console.error('Failed to create sub-goal:', error);
      // Remove optimistic goal on error
      setOptimisticSubGoals((prev) => prev.filter((g) => g._id !== tempId));
    }
  }, [newSubGoalTitle, onCreateChild, parentId]);

  /** Handles checkbox state change for sub-goal completion. */
  const handleCompleteChange = useCallback(
    (goalId: Id<'goals'>, checked: boolean | 'indeterminate') => {
      if (checked !== 'indeterminate') {
        onCompleteChange?.(goalId, checked);
      }
    },
    [onCompleteChange]
  );

  // Only hide if there are no sub-goals AND no way to create new ones
  // Show the section if:
  // - There are existing sub-goals to display, OR
  // - onCreateChild is provided (can create new ones), OR
  // - At max depth with onCreateChild (to show the depth message)
  const hasSubGoalsToDisplay = subGoals.length > 0;
  const canCreateSubGoals = !!onCreateChild;

  if (!hasSubGoalsToDisplay && !canCreateSubGoals) {
    return null;
  }

  return (
    <>
      <Separator className="my-3" />
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Sub-tasks</h4>

        {/* List of existing sub-goals */}
        {allSubGoals.length > 0 && (
          <div className="space-y-1">
            {allSubGoals.map((subGoal) => (
              <SubGoalItem
                key={subGoal._id}
                goal={subGoal}
                onCompleteChange={handleCompleteChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateChild={onCreateChild}
                depth={currentDepth + 1}
              />
            ))}
          </div>
        )}

        {/* Create input - always visible when allowed */}
        {canAddSubGoal && (
          <CreateInputView
            placeholder="Add a new sub-task..."
            value={newSubGoalTitle}
            onChange={setNewSubGoalTitle}
            onSubmit={handleCreateSubGoal}
            onEscape={() => setNewSubGoalTitle('')}
          />
        )}

        {/* Depth limit message - shown when at max depth and can't add more */}
        {isAtMaxDepth && onCreateChild && (
          <p className="text-xs text-muted-foreground/50 italic">
            Maximum nesting depth ({MAX_ADHOC_GOAL_DEPTH} levels) reached
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Props for the internal SubGoalItem component.
 */
interface SubGoalItemProps {
  goal: _OptimisticSubGoal;
  onCompleteChange?: (goalId: Id<'goals'>, checked: boolean | 'indeterminate') => void;
  onUpdate?: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => void;
  onDelete?: (goalId: Id<'goals'>) => void;
  onCreateChild?: (parentId: Id<'goals'>, title: string) => Promise<void>;
  depth: number;
}

/**
 * Renders an individual sub-goal item with checkbox and recursive children.
 */
function SubGoalItem({
  goal,
  onCompleteChange,
  onUpdate,
  onDelete,
  onCreateChild,
  depth,
}: SubGoalItemProps) {
  const isOptimistic = goal.isOptimistic;

  /** Handles goal update from edit popover. */
  const handleUpdate = useCallback(
    async (
      title: string,
      details: string | undefined,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      onUpdate?.(goal._id, title, details, dueDate, domainId);
    },
    [goal._id, onUpdate]
  );

  /** Handles completion toggle from popover. */
  const handleToggleComplete = useCallback(
    async (isComplete: boolean) => {
      onCompleteChange?.(goal._id, isComplete);
    },
    [goal._id, onCompleteChange]
  );

  /** Handles goal deletion. */
  const handleDelete = useCallback(() => {
    onDelete?.(goal._id);
  }, [goal._id, onDelete]);

  // Create a goal object compatible with GoalProvider
  const goalForProvider = {
    ...goal,
    path: '/',
    children: [],
  };

  const effectiveDomainId = goal.domainId || null;

  return (
    <GoalProvider goal={goalForProvider}>
      <div className="space-y-1">
        <div
          className={cn(
            'flex items-center gap-2 py-1 px-2 rounded-sm hover:bg-accent/50 transition-colors group/title',
            goal.isComplete && 'opacity-60',
            isOptimistic && 'opacity-70'
          )}
        >
          {isOptimistic ? (
            <Spinner className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Checkbox
              checked={goal.isComplete}
              onCheckedChange={(checked) => onCompleteChange?.(goal._id, checked)}
              className="h-4 w-4 flex-shrink-0"
            />
          )}
          {!isOptimistic && onUpdate ? (
            <AdhocGoalPopover
              onSave={handleUpdate}
              onToggleComplete={handleToggleComplete}
              triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0"
              titleClassName={cn(
                'text-sm',
                goal.isComplete && 'line-through text-muted-foreground'
              )}
              domain={goal.domain}
              weekNumber={goal.adhoc?.weekNumber}
              subGoals={goal.children}
              depth={depth}
              onChildCompleteChange={(goalId, isComplete) => onCompleteChange?.(goalId, isComplete)}
              onChildUpdate={onUpdate}
              onChildDelete={onDelete}
              onCreateChild={onCreateChild}
            />
          ) : (
            <span
              className={cn(
                'text-sm flex-1',
                goal.isComplete && 'line-through text-muted-foreground'
              )}
            >
              {goal.title}
            </span>
          )}

          {/* Action buttons - shown on hover */}
          {!isOptimistic && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <FireIcon goalId={goal._id} />
              <PendingIcon goalId={goal._id} />
              {onUpdate && (
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  initialDueDate={goal.adhoc?.dueDate}
                  initialDomainId={effectiveDomainId}
                  showDomainSelector={true}
                  onSave={handleUpdate}
                  trigger={
                    <button
                      type="button"
                      className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground focus:outline-none focus-visible:ring-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Render nested children recursively */}
        {goal.children && goal.children.length > 0 && (
          <div className="ml-6 border-l border-border/50 pl-2 space-y-1">
            {goal.children.map((child) => (
              <SubGoalItem
                key={child._id}
                goal={child}
                onCompleteChange={onCompleteChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateChild={onCreateChild}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </GoalProvider>
  );
}
