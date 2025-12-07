import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { Edit2, Trash2 } from 'lucide-react';
import React from 'react';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import type { DayOfWeek } from '@/lib/constants';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import { DailySummaryItem } from './DailySummaryItem';

/**
 * Props for the WeeklyTaskItem component.
 */
interface WeeklyTaskItemProps {
  /**
   * The weekly goal object, including its details, children (daily goals),
   * and additional week-specific information like week number and date range.
   */
  weeklyGoal: GoalWithDetailsAndChildren & {
    weekNumber: number;
    weekStartTimestamp: number;
    weekEndTimestamp: number;
  };
  /**
   * Optional actions for managing goals, such as toggling completion, editing, or deleting.
   */
  goalActions?: SummaryGoalActions;
  /**
   * Optional CSS class name for the component.
   */
  className?: string;
  /**
   * Whether to disable strikethrough for completed goals.
   */
  disableStrikethrough?: boolean;
}

/**
 * Displays a weekly goal as a task item with its associated daily goals in a flat list.
 * This is a simplified version of WeeklySummarySection focused on the new hierarchy structure.
 *
 * @param {WeeklyTaskItemProps} props - The props for the component.
 * @returns {JSX.Element} The rendered weekly task item.
 */
export function WeeklyTaskItem({
  weeklyGoal,
  goalActions,
  className,
  disableStrikethrough,
}: WeeklyTaskItemProps) {
  const isComplete = weeklyGoal.isComplete;
  const hasDailyGoals = React.useMemo(
    () => weeklyGoal.children && weeklyGoal.children.length > 0,
    [weeklyGoal.children]
  );

  const handleToggleComplete = React.useCallback(async () => {
    if (goalActions) {
      await goalActions.handleToggleComplete(weeklyGoal, weeklyGoal.weekNumber);
    }
  }, [goalActions, weeklyGoal]);

  const handleEdit = React.useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      if (goalActions) {
        await goalActions.handleEditGoal(weeklyGoal._id, title, details, dueDate);
      }
    },
    [goalActions, weeklyGoal._id]
  );

  const handleDelete = React.useCallback(async () => {
    if (goalActions) {
      await goalActions.handleDeleteGoal(weeklyGoal._id);
    }
  }, [goalActions, weeklyGoal._id]);

  // Group daily goals by day of week and sort them
  const sortedDailyGoals = React.useMemo(() => {
    if (!weeklyGoal.children) return [];

    return weeklyGoal.children
      .filter((dailyGoal) => dailyGoal.state?.daily?.dayOfWeek)
      .sort((a, b) => {
        const dayA = a.state?.daily?.dayOfWeek || 0;
        const dayB = b.state?.daily?.dayOfWeek || 0;
        return dayA - dayB;
      });
  }, [weeklyGoal.children]);

  return (
    <div className={cn('group border rounded-lg bg-card', className)}>
      {/* Weekly Goal Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isComplete}
            disabled={!goalActions}
            onCheckedChange={goalActions ? handleToggleComplete : undefined}
            className="mt-0.5 flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'font-semibold text-base leading-tight mb-1',
                !disableStrikethrough && isComplete && 'line-through text-muted-foreground',
                getDueDateStyle(
                  weeklyGoal.dueDate ? new Date(weeklyGoal.dueDate) : null,
                  weeklyGoal.isComplete
                )
              )}
            >
              {weeklyGoal.title}
            </h4>

            {weeklyGoal.details && (
              <div
                className={cn(
                  'text-sm text-muted-foreground leading-relaxed mb-2',
                  !disableStrikethrough && isComplete && 'line-through'
                )}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is user-generated and sanitized before rendering
                dangerouslySetInnerHTML={{ __html: weeklyGoal.details }}
              />
            )}
          </div>

          {/* Action Buttons */}
          {goalActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GoalEditPopover
                title={weeklyGoal.title}
                details={weeklyGoal.details}
                initialDueDate={weeklyGoal.dueDate}
                onSave={handleEdit}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                }
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Daily Goals - Flat List */}
      {hasDailyGoals && (
        <div className="px-4 pb-4 space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2 pl-7">
            Daily Goals ({sortedDailyGoals.length})
          </div>

          <div className="space-y-2 pl-7">
            {sortedDailyGoals.map((dailyGoal) => (
              <DailySummaryItem
                key={dailyGoal._id}
                dailyGoal={dailyGoal}
                dayOfWeek={dailyGoal.state?.daily?.dayOfWeek as DayOfWeek}
                weekNumber={weeklyGoal.weekNumber}
                goalActions={goalActions}
                disableStrikethrough={disableStrikethrough}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
