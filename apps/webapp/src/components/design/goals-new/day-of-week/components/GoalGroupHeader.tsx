import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SafeHTML } from '@/components/ui/safe-html';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, Pin, Star } from 'lucide-react';
import { GoalEditPopover } from '../../GoalEditPopover';
import { Id } from '@services/backend/convex/_generated/dataModel';

export interface GoalGroupHeaderProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
}

export const GoalGroupHeader = ({
  weeklyGoal,
  quarterlyGoal,
  onUpdateGoalTitle,
}: GoalGroupHeaderProps) => {
  const isStarred = quarterlyGoal.state?.isStarred ?? false;
  const isPinned = quarterlyGoal.state?.isPinned ?? false;

  return (
    <div>
      <div className="flex items-center justify-between">
        {/* Weekly Goal Title with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            >
              <span className="break-words w-full whitespace-pre-wrap">
                {weeklyGoal.title}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold break-words flex-1 mr-2">
                  {weeklyGoal.title}
                </h3>
                <GoalEditPopover
                  title={weeklyGoal.title}
                  details={weeklyGoal.details}
                  onSave={async (title, details) => {
                    await onUpdateGoalTitle(weeklyGoal._id, title, details);
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
              {weeklyGoal.details && (
                <SafeHTML html={weeklyGoal.details} className="mt-2 text-sm" />
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        {isStarred && (
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        )}
        {isPinned && (
          <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
        )}
        {/* Quarterly Goal Title with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            >
              <span className="break-words w-full whitespace-pre-wrap">
                {quarterlyGoal.title}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold break-words flex-1 mr-2">
                  {quarterlyGoal.title}
                </h3>
                <GoalEditPopover
                  title={quarterlyGoal.title}
                  details={quarterlyGoal.details}
                  onSave={async (title, details) => {
                    await onUpdateGoalTitle(quarterlyGoal._id, title, details);
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
              {quarterlyGoal.details && (
                <SafeHTML
                  html={quarterlyGoal.details}
                  className="mt-2 text-sm"
                />
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
