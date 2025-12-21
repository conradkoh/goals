import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import React from 'react';

import { SummaryGoalActionIcons } from '@/components/molecules/goal-action-icons';
import { Checkbox } from '@/components/ui/checkbox';
import type { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { type DayOfWeek, getDayName } from '@/lib/constants';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';

/**
 * Props for the DailySummaryItem component.
 */
interface DailySummaryItemProps {
  /**
   * The daily goal object to display.
   */
  dailyGoal: GoalWithDetailsAndChildren;
  /**
   * The day of the week for the daily goal.
   */
  dayOfWeek: DayOfWeek;
  /**
   * The week number to which this daily goal belongs.
   */
  weekNumber: number;
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
 * Displays a single daily goal summary item within a weekly summary section.
 * It shows the goal's title, completion status, day of the week, and provides
 * options to edit, delete, or toggle its completion.
 *
 * @param {DailySummaryItemProps} props - The props for the component.
 * @returns {JSX.Element} The rendered daily summary item.
 */
export function DailySummaryItem({
  dailyGoal,
  dayOfWeek,
  weekNumber,
  goalActions,
  className,
  disableStrikethrough,
}: DailySummaryItemProps) {
  const isComplete = dailyGoal.isComplete;
  const dayName = React.useMemo(() => getDayName(dayOfWeek), [dayOfWeek]);

  // Format completion date if available
  const completedDate = React.useMemo(() => {
    return dailyGoal.completedAt
      ? DateTime.fromMillis(dailyGoal.completedAt).toFormat('LLL d')
      : null;
  }, [dailyGoal.completedAt]);

  const handleToggleComplete = React.useCallback(async () => {
    if (goalActions) {
      await goalActions.handleToggleComplete(dailyGoal, weekNumber);
    }
  }, [goalActions, dailyGoal, weekNumber]);

  const handleEdit = React.useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      if (goalActions) {
        await goalActions.handleEditGoal(dailyGoal._id, title, details, dueDate);
      }
    },
    [goalActions, dailyGoal._id]
  );

  const handleDelete = React.useCallback(async () => {
    if (goalActions) {
      await goalActions.handleDeleteGoal(dailyGoal._id);
    }
  }, [goalActions, dailyGoal._id]);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        isComplete && 'opacity-75',
        className
      )}
    >
      <Checkbox
        checked={isComplete}
        disabled={!goalActions}
        onCheckedChange={goalActions ? handleToggleComplete : undefined}
        className="mt-0.5 flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
            {dayName}
          </span>
          {completedDate && (
            <span className="text-xs text-green-600">Completed {completedDate}</span>
          )}
        </div>

        <h4
          className={cn(
            'font-medium text-sm leading-tight mb-1',
            !disableStrikethrough && isComplete && 'line-through text-muted-foreground',
            getDueDateStyle(
              dailyGoal.dueDate ? new Date(dailyGoal.dueDate) : null,
              dailyGoal.isComplete
            )
          )}
        >
          {dailyGoal.title}
        </h4>

        {dailyGoal.details && (
          <div
            className={cn(
              'text-xs text-muted-foreground leading-relaxed',
              !disableStrikethrough && isComplete && 'line-through'
            )}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is user-generated and sanitized before rendering
            dangerouslySetInnerHTML={{ __html: dailyGoal.details }}
          />
        )}
      </div>

      {/* Action Buttons */}
      {goalActions && (
        <SummaryGoalActionIcons
          title={dailyGoal.title}
          details={dailyGoal.details}
          initialDueDate={dailyGoal.dueDate}
          onSave={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
