import type { Id } from '@services/backend/convex/_generated/dataModel';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultipleQuarterlyGoalsSummary } from '@/hooks/useMultipleQuarterlyGoalsSummary';
import type { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { cn } from '@/lib/utils';
import { WeekSection } from './WeekSection';

interface MultiQuarterlyGoalSummaryViewProps {
  quarterlyGoalIds: Id<'goals'>[];
  year: number;
  quarter: number;
  goalActions?: SummaryGoalActions;
  className?: string;
}

function MultiQuarterlyGoalSummaryViewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading items don't need unique keys
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <div className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MultiQuarterlyGoalSummaryView({
  quarterlyGoalIds,
  year,
  quarter,
  goalActions,
  className,
}: MultiQuarterlyGoalSummaryViewProps) {
  const { summaryData, isLoading, error } = useMultipleQuarterlyGoalsSummary({
    quarterlyGoalIds,
    year,
    quarter,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <MultiQuarterlyGoalSummaryViewSkeleton />
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load quarterly goals summary'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Q{quarter} {year} Multi-Goal Summary
            </h1>
            <p className="text-sm text-muted-foreground">
              Summary of {summaryData.quarterlyGoals.length} selected quarterly goals
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {summaryData.quarterlyGoals.map((goalSummary, index) => {
          const { quarterlyGoal, weeklyGoalsByWeek } = goalSummary;
          const isComplete = quarterlyGoal.isComplete;

          return (
            <div key={quarterlyGoal._id} className="space-y-6">
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                    Goal {index + 1}
                  </span>
                  {isComplete && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <h2
                  className={cn(
                    'text-xl font-bold text-gray-900 mb-2 leading-tight',
                    isComplete && 'text-gray-500 line-through'
                  )}
                >
                  {quarterlyGoal.title}
                </h2>

                {quarterlyGoal.details && (
                  <div
                    className={cn(
                      'text-sm text-muted-foreground leading-relaxed',
                      isComplete && 'line-through'
                    )}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is user-generated and sanitized before rendering
                    dangerouslySetInnerHTML={{ __html: quarterlyGoal.details }}
                  />
                )}
              </div>

              {Object.keys(weeklyGoalsByWeek).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Weekly Goals</h3>
                  {Object.entries(weeklyGoalsByWeek)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([weekNum, weeklyGoals]) => (
                      <WeekSection
                        key={`${quarterlyGoal._id}-week-${weekNum}`}
                        weekNumber={Number(weekNum)}
                        year={year}
                        weeklyGoals={weeklyGoals}
                        goalActions={goalActions}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
