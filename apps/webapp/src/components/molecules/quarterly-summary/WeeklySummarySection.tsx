import React, { useState } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DailySummaryItem } from './DailySummaryItem';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';
import { DayOfWeek } from '@/lib/constants';
import { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';

/**
 * Props for the WeeklySummarySection component.
 */
interface WeeklySummarySectionProps {
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
 * Displays a summary section for a weekly goal, including its completion status,
 * title, details, and a collapsible list of associated daily goals.
 * It also provides actions to edit, delete, or toggle completion of the weekly goal.
 *
 * @param {WeeklySummarySectionProps} props - The props for the component.
 * @returns {JSX.Element} The rendered weekly summary section.
 */
export function WeeklySummarySection({
  weeklyGoal,
  goalActions,
  className,
  disableStrikethrough,
}: WeeklySummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isComplete = weeklyGoal.isComplete;
  const hasDailyGoals = React.useMemo(() => weeklyGoal.children && weeklyGoal.children.length > 0, [weeklyGoal.children]);

  const handleToggleComplete = React.useCallback(async () => {
    if (goalActions) {
      await goalActions.handleToggleComplete(weeklyGoal, weeklyGoal.weekNumber);
    }
  }, [goalActions, weeklyGoal]);

  const handleEdit = React.useCallback(async (title: string, details?: string) => {
    if (goalActions) {
      await goalActions.handleEditGoal(weeklyGoal._id, title, details);
    }
  }, [goalActions, weeklyGoal._id]);

  const handleDelete = React.useCallback(async () => {
    if (goalActions && confirm(`Are you sure you want to delete "${weeklyGoal.title}"? This will also delete all daily goals under it.`)) {
      await goalActions.handleDeleteGoal(weeklyGoal._id);
    }
  }, [goalActions, weeklyGoal._id, weeklyGoal.title]);
  
  // Format week date range
  const { weekStart, weekEnd, weekDateRange } = React.useMemo(() => {
    const weekStart = DateTime.fromMillis(weeklyGoal.weekStartTimestamp);
    const weekEnd = DateTime.fromMillis(weeklyGoal.weekEndTimestamp);
    const weekDateRange = `${weekStart.toFormat('LLL d')} - ${weekEnd.toFormat('LLL d')}`;
    return { weekStart, weekEnd, weekDateRange };
  }, [weeklyGoal.weekStartTimestamp, weeklyGoal.weekEndTimestamp]);
  
  // Group daily goals by day of week
  const dailyGoalsByDay = React.useMemo(() => {
    return weeklyGoal.children?.reduce((acc, dailyGoal) => {
      if (dailyGoal.state?.daily?.dayOfWeek) {
        const dayOfWeek = dailyGoal.state.daily.dayOfWeek;
        if (!acc[dayOfWeek]) {
          acc[dayOfWeek] = [];
        }
        acc[dayOfWeek].push(dailyGoal);
      }
      return acc;
    }, {} as Record<DayOfWeek, GoalWithDetailsAndChildren[]>) || {};
  }, [weeklyGoal.children]);

  // Sort days of week in order
  const sortedDays = React.useMemo(() => {
    return Object.keys(dailyGoalsByDay)
      .map(Number)
      .sort() as DayOfWeek[];
  }, [dailyGoalsByDay]);

  return (
    <div className={cn('group border rounded-lg bg-card', className)}>
      {/* Weekly Goal Header */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-3 mb-2">
          <Checkbox
            checked={isComplete}
            disabled={!goalActions}
            onCheckedChange={goalActions ? handleToggleComplete : undefined}
            className="mt-0.5 flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Week {weeklyGoal.weekNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                {weekDateRange}
              </span>
            </div>
            
            <h3
              className={cn(
                'font-semibold text-base leading-tight mb-1',
                !disableStrikethrough && isComplete && 'line-through text-muted-foreground'
              )}
            >
              {weeklyGoal.title}
            </h3>
            
            {weeklyGoal.details && (
              <div
                className={cn(
                  'text-sm text-muted-foreground leading-relaxed',
                  !disableStrikethrough && isComplete && 'line-through'
                )}
                dangerouslySetInnerHTML={{ __html: weeklyGoal.details }}
              />
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {goalActions && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GoalEditPopover
                  title={weeklyGoal.title}
                  details={weeklyGoal.details}
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
            
            {hasDailyGoals && (
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
            )}
          </div>
        </div>
      </div>

      {/* Daily Goals Section */}
      {hasDailyGoals && isExpanded && (
        <div className="p-4 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Daily Goals ({weeklyGoal.children.length})
          </h4>
          
          {sortedDays.length > 0 ? (
            <div className="space-y-3">
              {sortedDays.map((dayOfWeek) => (
                <div key={dayOfWeek} className="space-y-2">
                  {dailyGoalsByDay[dayOfWeek].map((dailyGoal) => (
                    <DailySummaryItem
                      key={dailyGoal._id}
                      dailyGoal={dailyGoal}
                      dayOfWeek={dayOfWeek}
                      weekNumber={weeklyGoal.weekNumber}
                      goalActions={goalActions}
                      disableStrikethrough={disableStrikethrough}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No daily goals for this week
            </div>
          )}
        </div>
      )}
      
      {!hasDailyGoals && (
        <div className="px-4 pb-4">
          <div className="text-sm text-muted-foreground text-center py-2">
            No daily goals for this week
          </div>
        </div>
      )}
    </div>
  );
} 