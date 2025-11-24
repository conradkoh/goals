import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import { DomainBadge } from '@/components/atoms/DomainBadge';
import { FireIcon } from '@/components/atoms/FireIcon';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { GoalProvider } from '@/contexts/GoalContext';
import { cn } from '@/lib/utils';

/**
 * Props for the AdhocGoalItem component.
 */
export interface AdhocGoalItemProps {
  /** The adhoc goal to display with optional domain and optimistic flag */
  goal: Doc<'goals'> & { domain?: Doc<'domains'>; isOptimistic?: boolean };
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
  /** Whether to display the due date in the goal item */
  showDueDate?: boolean;
  /** Whether to display the domain badge in the goal item */
  showDomain?: boolean;
  /** Additional CSS classes to apply to the root element */
  className?: string;
}

/**
 * Renders an individual adhoc goal item with interactive controls.
 * Displays goal details via GoalDetailsPopover and provides actions for editing, completing, and deleting.
 */
export function AdhocGoalItem({
  goal,
  onCompleteChange,
  onUpdate,
  onDelete,
  showDueDate = true,
  showDomain = true,
  className,
}: AdhocGoalItemProps) {
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

  const effectiveDomainId = goal.domainId || null;
  const isOptimistic = 'isOptimistic' in goal && goal.isOptimistic;

  const additionalContent = (
    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
      {showDueDate && goal.adhoc?.dueDate && (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {_formatDueDate(goal.adhoc.dueDate)}
        </div>
      )}
      {/* dayOfWeek removed - adhoc tasks are week-level only */}
      {showDomain && goal.domain && <DomainBadge domain={goal.domain} />}
    </div>
  );

  const goalWithChildren = {
    ...goal,
    path: '/',
    children: [],
  };

  return (
    <GoalProvider goal={goalWithChildren}>
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
            <GoalDetailsPopover
              onSave={handleUpdate}
              triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
              titleClassName={cn(goal.isComplete && 'line-through text-muted-foreground')}
              onToggleComplete={handleToggleComplete}
              additionalContent={additionalContent}
            />
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn('text-sm', goal.isComplete && 'line-through text-muted-foreground')}
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
    </GoalProvider>
  );
}

/**
 * Formats a Unix timestamp as a date string.
 */
function _formatDueDate(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d, yyyy');
}

/**
 * Formats a day of week number (1-7) as a short day name.
 */
function _formatDayOfWeek(dayOfWeek: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek - 1];
}
