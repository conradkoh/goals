import React, { useState } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { WeeklyTaskItem } from './WeeklyTaskItem';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';
import { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';

/**
 * Props for the WeekSection component.
 */
interface WeekSectionProps {
  /**
   * The week number for this section.
   */
  weekNumber: number;
  /**
   * The year for calculating week dates.
   */
  year: number;
  /**
   * Array of weekly goals for this week.
   */
  weeklyGoals: (GoalWithDetailsAndChildren & {
    weekNumber: number;
    weekStartTimestamp: number;
    weekEndTimestamp: number;
  })[];
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
 * Displays a section for a specific week, containing all weekly goals for that week.
 * Each weekly goal is rendered as a WeeklyTaskItem with its associated daily goals.
 * The section is collapsible and shows the week number and date range.
 *
 * @param {WeekSectionProps} props - The props for the component.
 * @returns {JSX.Element} The rendered week section.
 */
export function WeekSection({
  weekNumber,
  year,
  weeklyGoals,
  goalActions,
  className,
  disableStrikethrough,
}: WeekSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate week date range from the first weekly goal (they should all have the same timestamps)
  const { weekDateRange } = React.useMemo(() => {
    if (weeklyGoals.length === 0) {
      // Fallback calculation if no weekly goals
      const weekStart = DateTime.fromObject({
        weekNumber,
        weekYear: year,
      }).startOf('week');
      const weekEnd = weekStart.endOf('week');
      return {
        weekDateRange: `${weekStart.toFormat('LLL d')} - ${weekEnd.toFormat('LLL d')}`,
      };
    }

    const weekStart = DateTime.fromMillis(weeklyGoals[0].weekStartTimestamp);
    const weekEnd = DateTime.fromMillis(weeklyGoals[0].weekEndTimestamp);
    return {
      weekDateRange: `${weekStart.toFormat('LLL d')} - ${weekEnd.toFormat('LLL d')}`,
    };
  }, [weekNumber, year, weeklyGoals]);

  // Calculate totals for this week
  const totalWeeklyGoals = weeklyGoals.length;
  const completedWeeklyGoals = weeklyGoals.filter(goal => goal.isComplete).length;
  const totalDailyGoals = weeklyGoals.reduce((sum, goal) => sum + (goal.children?.length || 0), 0);
  const completedDailyGoals = weeklyGoals.reduce((sum, goal) => {
    return sum + (goal.children?.filter(daily => daily.isComplete).length || 0);
  }, 0);

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      {/* Week Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Week {weekNumber}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {weekDateRange}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {completedWeeklyGoals}/{totalWeeklyGoals} weekly goals
                </span>
                {totalDailyGoals > 0 && (
                  <span>
                    {completedDailyGoals}/{totalDailyGoals} daily goals
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goals List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {weeklyGoals.map((weeklyGoal) => (
            <WeeklyTaskItem
              key={weeklyGoal._id}
              weeklyGoal={weeklyGoal}
              goalActions={goalActions}
              disableStrikethrough={disableStrikethrough}
            />
          ))}
        </div>
      )}
    </div>
  );
} 