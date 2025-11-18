import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { DomainBadge } from '@/components/atoms/DomainBadge';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface AdhocGoalItemProps {
  goal: Doc<'goals'> & { domain?: Doc<'domains'>; isOptimistic?: boolean };
  onCompleteChange?: (goalId: Id<'goals'>, isComplete: boolean) => void;
  onUpdate?: (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => void;
  onDelete?: (goalId: Id<'goals'>) => void;
  showDueDate?: boolean;
  className?: string;
}

export function AdhocGoalItem({
  goal,
  onCompleteChange,
  onUpdate,
  onDelete,
  showDueDate = true,
  className,
}: AdhocGoalItemProps) {
  const handleCompleteChange = (checked: boolean | 'indeterminate') => {
    if (checked !== 'indeterminate') {
      onCompleteChange?.(goal._id, checked);
    }
  };

  const handleUpdate = async (title: string, details: string, dueDate?: number) => {
    onUpdate?.(goal._id, title, details, dueDate);
  };

  const handleDelete = () => {
    if (confirm('Delete this adhoc task?')) {
      onDelete?.(goal._id);
    }
  };

  const formatDueDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  const isOptimistic = 'isOptimistic' in goal && goal.isOptimistic;

  return (
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

      <div className="flex-1 min-w-0 flex items-start justify-between group/title">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn('text-sm', goal.isComplete && 'line-through text-muted-foreground')}
            >
              {goal.title}
            </span>
            {goal.domain && <DomainBadge domain={goal.domain} />}
          </div>

          {goal.details && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{goal.details}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {showDueDate && goal.adhoc?.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDueDate(goal.adhoc.dueDate)}
              </div>
            )}

            {goal.adhoc?.dayOfWeek && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][goal.adhoc.dayOfWeek - 1]}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isOptimistic ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <>
              {onUpdate && (
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  initialDueDate={goal.adhoc?.dueDate}
                  onSave={handleUpdate}
                  trigger={
                    <button
                      type="button"
                      className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground"
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
                  className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
