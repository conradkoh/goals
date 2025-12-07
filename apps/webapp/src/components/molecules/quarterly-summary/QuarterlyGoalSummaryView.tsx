import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { AlertCircle, Pin, Star } from 'lucide-react';
import { DateTime } from 'luxon';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuarterlyGoalSummary } from '@/hooks/useQuarterlyGoalSummary';
import type { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { cn } from '@/lib/utils';
import { WeekSection } from './WeekSection';

/**
 * Props for the QuarterlyGoalSummaryView component.
 */
interface QuarterlyGoalSummaryViewProps {
  /**
   * The ID of the quarterly goal to display.
   */
  quarterlyGoalId: Id<'goals'>;
  /**
   * The year of the quarter.
   */
  year: number;
  /**
   * The quarter number (1-4).
   */
  quarter: number;
  /**
   * Optional actions for managing goals, such as starring, pinning, or completing.
   */
  goalActions?: SummaryGoalActions;
  /**
   * Optional CSS class name for the component.
   */
  className?: string;
}

/**
 * A skeleton component to display while the quarterly goal summary data is loading.
 * It provides a visual placeholder for the various sections of the summary view.
 *
 * @returns {JSX.Element} The rendered skeleton component.
 */
function QuarterlyGoalSummaryViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Weekly sections skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading items don't need unique keys
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Displays a comprehensive summary of a quarterly goal, including its completion status,
 * associated weekly goals, and detailed statistics. It handles loading states and errors.
 *
 * @param {QuarterlyGoalSummaryViewProps} props - The props for the component.
 * @returns {JSX.Element} The rendered quarterly goal summary view.
 */
export function QuarterlyGoalSummaryView({
  quarterlyGoalId,
  year,
  quarter,
  goalActions,
  className,
}: QuarterlyGoalSummaryViewProps) {
  const { summaryData, isLoading, error } = useQuarterlyGoalSummary({
    quarterlyGoalId,
    year,
    quarter,
  });

  const { quarterlyGoal, weeklyGoalsByWeek } = summaryData || {};
  const isComplete = quarterlyGoal?.isComplete;
  const isStarred = quarterlyGoal?.state?.isStarred || false;
  const isPinned = quarterlyGoal?.state?.isPinned || false;

  // Format completion date if available
  const completedDate = React.useMemo(() => {
    return quarterlyGoal?.completedAt
      ? DateTime.fromMillis(quarterlyGoal.completedAt).toFormat('LLL d, yyyy')
      : null;
  }, [quarterlyGoal?.completedAt]);

  // Group weekly goals by week number and sort weeks
  const weeksByNumber = React.useMemo(() => {
    if (!weeklyGoalsByWeek) return [];

    // biome-ignore lint/suspicious/noExplicitAny: weekly goal shape varies by backend response
    const weekMap: Record<number, any[]> = {};

    Object.entries(weeklyGoalsByWeek).forEach(([weekNum, goals]) => {
      const weekNumber = Number(weekNum);
      if (goals && goals.length > 0) {
        weekMap[weekNumber] = goals;
      }
    });

    return Object.keys(weekMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((weekNum) => ({
        weekNumber: weekNum,
        weeklyGoals: weekMap[weekNum],
      }));
  }, [weeklyGoalsByWeek]);

  // Calculate summary stats
  const totalWeeklyGoals = React.useMemo(() => {
    return Object.values(weeklyGoalsByWeek || {}).flat().length;
  }, [weeklyGoalsByWeek]);

  const completedWeeklyGoals = React.useMemo(() => {
    return Object.values(weeklyGoalsByWeek || {})
      .flat()
      .filter((goal) => goal.isComplete).length;
  }, [weeklyGoalsByWeek]);

  const totalDailyGoals = React.useMemo(() => {
    return Object.values(weeklyGoalsByWeek || {})
      .flat()
      .reduce((sum, weeklyGoal) => sum + (weeklyGoal.children?.length || 0), 0);
  }, [weeklyGoalsByWeek]);

  const completedDailyGoals = React.useMemo(() => {
    return Object.values(weeklyGoalsByWeek || {})
      .flat()
      .reduce((sum, weeklyGoal) => {
        return (
          sum +
          (weeklyGoal.children?.filter((daily: (typeof weeklyGoal.children)[0]) => daily.isComplete)
            .length || 0)
        );
      }, 0);
  }, [weeklyGoalsByWeek]);

  if (isLoading) {
    return (
      <div className={className}>
        <QuarterlyGoalSummaryViewSkeleton />
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load quarterly goal summary'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quarterly Goal Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4 mb-4">
          <Checkbox checked={isComplete} disabled className="mt-1 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                Q{quarter} {year}
              </span>
              {isStarred && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-xs font-medium">Starred</span>
                </div>
              )}
              {isPinned && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Pin className="h-4 w-4 fill-current" />
                  <span className="text-xs font-medium">Pinned</span>
                </div>
              )}
            </div>

            <h1
              className={cn(
                'text-2xl font-bold text-gray-900 mb-2 leading-tight',
                isComplete && 'text-gray-500'
              )}
            >
              {quarterlyGoal?.title}
            </h1>

            {completedDate && (
              <div className="text-sm text-green-600 font-medium mb-2">
                Completed on {completedDate}
              </div>
            )}

            {quarterlyGoal?.details && (
              <div
                className={cn('text-gray-700 leading-relaxed', isComplete && 'text-gray-500')}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is user-generated and sanitized before rendering
                dangerouslySetInnerHTML={{ __html: quarterlyGoal.details }}
              />
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">
              {completedWeeklyGoals}/{totalWeeklyGoals}
            </div>
            <div className="text-xs text-blue-600">Weekly Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-700">
              {completedDailyGoals}/{totalDailyGoals}
            </div>
            <div className="text-xs text-indigo-600">Daily Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{weeksByNumber.length}</div>
            <div className="text-xs text-purple-600">Active Weeks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">
              {Math.round(
                ((completedWeeklyGoals + completedDailyGoals) /
                  (totalWeeklyGoals + totalDailyGoals)) *
                  100
              ) || 0}
              %
            </div>
            <div className="text-xs text-green-600">Completion</div>
          </div>
        </div>
      </div>

      {/* Weekly Goals Sections */}
      {weeksByNumber.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Weekly Goals ({totalWeeklyGoals})
          </h2>

          {weeksByNumber.map(({ weekNumber, weeklyGoals }) => (
            <WeekSection
              key={weekNumber}
              weekNumber={weekNumber}
              year={year}
              weeklyGoals={weeklyGoals}
              goalActions={goalActions}
              disableStrikethrough={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">No weekly goals yet</div>
          <div className="text-sm">
            This quarterly goal doesn't have any weekly goals assigned to it.
          </div>
        </div>
      )}
    </div>
  );
}
