import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@services/backend/convex/adhocGoal';
import { format } from 'date-fns';
import { Calendar, Edit2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DomainBadge } from '@/components/atoms/DomainBadge';
import { FireIcon } from '@/components/atoms/FireIcon';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { AdhocGoalPopover } from '@/components/molecules/goal-details-popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GoalProvider } from '@/contexts/GoalContext';
import { cn } from '@/lib/utils';

/**
 * Maximum nesting depth for adhoc goals (soft limit).
 */
const MAX_ADHOC_GOAL_DEPTH = 3;

/**
 * Props for the AdhocGoalItem component.
 */
export interface AdhocGoalItemProps {
  /** The adhoc goal to display with optional domain, children, and optimistic flag */
  goal:
    | (Doc<'goals'> & { domain?: Doc<'domains'>; isOptimistic?: boolean })
    | AdhocGoalWithChildren;
  /** Callback fired when the goal's completion status changes */
  onCompleteChange?: (goalId: Id<'goals'>, isComplete: boolean) => void;
  /** Callback fired when the goal is updated */
  onUpdate?: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => void;
  /** Callback fired when the goal is deleted */
  onDelete?: (goalId: Id<'goals'>) => void;
  /** Callback fired when a child goal is created */
  onCreateChild?: (parentId: Id<'goals'>, title: string) => Promise<void>;
  /** Whether to display the due date in the goal item */
  showDueDate?: boolean;
  /** Whether to display the domain badge in the goal item */
  showDomain?: boolean;
  /** Additional CSS classes to apply to the root element */
  className?: string;
  /** Current nesting depth (0 = root level) */
  depth?: number;
}

/**
 * Renders an individual adhoc goal item with interactive controls.
 * Displays goal details via GoalDetailsPopover and provides actions for editing, completing, and deleting.
 * Supports nested children with recursive rendering.
 */
export function AdhocGoalItem({
  goal,
  onCompleteChange,
  onUpdate,
  onDelete,
  onCreateChild,
  showDueDate = true,
  showDomain = true,
  className,
  depth = 0,
}: AdhocGoalItemProps) {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);

  const handleCompleteChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (checked !== 'indeterminate') {
        onCompleteChange?.(goal._id, checked);
      }
    },
    [goal._id, onCompleteChange]
  );

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

  const handleToggleComplete = useCallback(
    async (isComplete: boolean) => {
      onCompleteChange?.(goal._id, isComplete);
    },
    [goal._id, onCompleteChange]
  );

  const handleDelete = useCallback(() => {
    onDelete?.(goal._id);
  }, [goal._id, onDelete]);

  const handleAddSubtaskClick = useCallback(() => {
    setIsAddingSubtask(true);
  }, []);

  const handleSubtaskSubmit = useCallback(async () => {
    if (!subtaskTitle.trim() || !onCreateChild) return;

    setIsCreatingSubtask(true);
    try {
      await onCreateChild(goal._id, subtaskTitle.trim());
      setSubtaskTitle('');
      setIsAddingSubtask(false);
    } catch (error) {
      console.error('Failed to create subtask:', error);
    } finally {
      setIsCreatingSubtask(false);
    }
  }, [goal._id, subtaskTitle, onCreateChild]);

  const handleSubtaskKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubtaskSubmit();
      } else if (e.key === 'Escape') {
        setIsAddingSubtask(false);
        setSubtaskTitle('');
      }
    },
    [handleSubtaskSubmit]
  );

  const effectiveDomainId = goal.domainId || null;
  const isOptimistic = 'isOptimistic' in goal && goal.isOptimistic;
  const children = 'children' in goal ? goal.children : [];
  const canAddSubtask = depth < MAX_ADHOC_GOAL_DEPTH && onCreateChild && !isOptimistic;

  const goalWithChildren = {
    ...goal,
    path: '/',
    children: [],
  };

  // Add subtask button with tooltip for max depth
  const addSubtaskButton = canAddSubtask ? (
    <button
      type="button"
      onClick={handleAddSubtaskClick}
      className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground focus:outline-none focus-visible:ring-0"
      title="Add subtask"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  ) : depth >= MAX_ADHOC_GOAL_DEPTH && onCreateChild ? (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            className="text-muted-foreground/40 opacity-0 group-hover/title:opacity-100 transition-opacity cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Maximum nesting depth ({MAX_ADHOC_GOAL_DEPTH} levels) reached</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  return (
    <GoalProvider goal={goalWithChildren}>
      <div className={cn('space-y-0.5', depth > 0 && 'ml-4 border-l border-border/50 pl-2')}>
        {/* Main goal item */}
        <div
          className={cn(
            'flex items-start gap-2 group/task rounded-sm hover:bg-accent/50 transition-colors py-1',
            goal.isComplete && 'opacity-60',
            className
          )}
        >
          <Checkbox
            checked={goal.isComplete}
            onCheckedChange={handleCompleteChange}
            className="mt-0.5"
            disabled={isOptimistic}
          />

          <div className="flex-1 min-w-0 flex items-center justify-between group/title">
            {onUpdate ? (
              <AdhocGoalPopover
                onSave={handleUpdate}
                triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
                titleClassName={cn(goal.isComplete && 'line-through text-muted-foreground')}
                onToggleComplete={handleToggleComplete}
                domain={goal.domain}
                weekNumber={goal.adhoc?.weekNumber}
                subGoals={children}
                depth={depth}
                onChildCompleteChange={onCompleteChange}
                onChildUpdate={onUpdate}
                onCreateChild={onCreateChild}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm',
                      goal.isComplete && 'line-through text-muted-foreground'
                    )}
                  >
                    {goal.title}
                  </span>
                  {showDomain && goal.domain && <DomainBadge domain={goal.domain} />}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {showDueDate && goal.adhoc?.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {_formatDueDate(goal.adhoc.dueDate)}
                    </div>
                  )}

                  {/* dayOfWeek removed - adhoc tasks are week-level only */}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              {isOptimistic ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <>
                  <FireIcon goalId={goal._id} />
                  <PendingIcon goalId={goal._id} />
                  {addSubtaskButton}
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inline subtask input */}
        {isAddingSubtask && (
          <div className="ml-6 flex items-center gap-2 py-1">
            <Input
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
              placeholder="Add subtask..."
              className="h-7 text-sm flex-1"
              autoFocus
              disabled={isCreatingSubtask}
            />
            {isCreatingSubtask && <Spinner className="h-4 w-4" />}
          </div>
        )}

        {/* Render children recursively */}
        {children.length > 0 && (
          <div className="space-y-0.5">
            {children.map((child) => (
              <AdhocGoalItem
                key={child._id}
                goal={child}
                onCompleteChange={onCompleteChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateChild={onCreateChild}
                showDueDate={showDueDate}
                showDomain={showDomain}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </GoalProvider>
  );
}

/**
 * Formats a Unix timestamp as a human-readable date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
function _formatDueDate(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d, yyyy');
}
