import type { Doc } from '@services/backend/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { DomainBadge } from '@/components/atoms/DomainBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdhocGoalItemProps {
  goal: Doc<'goals'> & { domain?: Doc<'domains'> };
  onCompleteChange?: (goalId: string, isComplete: boolean) => void;
  onEdit?: (goal: Doc<'goals'> & { domain?: Doc<'domains'> }) => void;
  onDelete?: (goalId: string) => void;
  showDueDate?: boolean;
  className?: string;
}

export function AdhocGoalItem({
  goal,
  onCompleteChange,
  onEdit,
  onDelete,
  showDueDate = true,
  className,
}: AdhocGoalItemProps) {
  const handleCompleteChange = (checked: boolean) => {
    onCompleteChange?.(goal._id, checked);
  };

  const handleEdit = () => {
    onEdit?.(goal);
  };

  const handleDelete = () => {
    onDelete?.(goal._id);
  };

  const formatDueDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border bg-card
        hover:bg-accent/50 transition-colors
        ${goal.isComplete ? 'opacity-60' : ''}
        ${className}
      `}
    >
      <Checkbox checked={goal.isComplete} onCheckedChange={handleCompleteChange} className="mt-1" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className={`
                font-medium text-sm
                ${goal.isComplete ? 'line-through text-muted-foreground' : ''}
              `}
            >
              {goal.title}
            </h4>

            {goal.details && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.details}</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              {goal.domain && <DomainBadge domain={goal.domain} />}

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

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>}
                {onDelete && (
                  <>
                    {onEdit && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
