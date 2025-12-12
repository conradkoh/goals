import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { Pin, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GoalSelectorProps {
  goals: GoalWithDetailsAndChildren[];
  value?: Id<'goals'>;
  onChange: (goalId: Id<'goals'>) => void;
  placeholder?: string;
  emptyStateMessage?: string;
  disabled?: boolean;
}

export const GoalSelector = ({
  goals,
  value,
  onChange,
  placeholder = 'Select goal',
  emptyStateMessage = 'No goals available',
  disabled,
}: GoalSelectorProps) => {
  const hasGoals = goals.length > 0;

  return (
    <Select
      value={value?.toString()}
      onValueChange={(value) => onChange(value as Id<'goals'>)}
      disabled={disabled || !hasGoals}
    >
      <SelectTrigger className="h-12 text-xs">
        <SelectValue placeholder={hasGoals ? placeholder : emptyStateMessage} />
      </SelectTrigger>
      <SelectContent>
        {hasGoals ? (
          goals.map((goal) => (
            <SelectItem key={goal._id} value={goal._id} className="h-12">
              <div className="py-1">
                <div className="flex items-center gap-1">
                  <span className="break-words flex-1">{goal.title}</span>
                  {goal.state?.isPinned && (
                    <Pin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  )}
                  {goal.state?.isStarred && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="none" disabled className="h-12">
            <div className="py-1">
              <span className="text-muted-foreground">No goals available</span>
            </div>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};
