import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GoalEditPopover } from '@/components/design/goals-new/GoalEditPopover';
import { SafeHTML } from '@/components/ui/safe-html';
import { Star, Pin, Edit2 } from 'lucide-react';

export interface QuarterlyGoalHeaderProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
}

export const QuarterlyGoalHeader = ({
  goal,
  onUpdateTitle,
}: QuarterlyGoalHeaderProps) => {
  const isStarred = goal.state?.isStarred ?? false;
  const isPinned = goal.state?.isPinned ?? false;

  return (
    <div className="flex items-center gap-1.5 mb-2">
      {isStarred && (
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
      )}
      {isPinned && (
        <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          >
            <span className="break-words w-full whitespace-pre-wrap">
              {goal.title}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold break-words flex-1 mr-2">
                {goal.title}
              </h3>
              <GoalEditPopover
                title={goal.title}
                details={goal.details}
                onSave={async (title, details) => {
                  await onUpdateTitle(goal._id, title, details);
                }}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
            {goal.details && (
              <SafeHTML html={goal.details} className="mt-2 text-sm" />
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
