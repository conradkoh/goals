import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuarterSummary } from '@/hooks/useQuarterSummary';
import type { SummaryGoalActions } from '@/hooks/useSummaryGoalActions';
import { cn } from '@/lib/utils';
import { WeekSection } from './WeekSection';

/**
 * Props for the QuarterSummaryResults component.
 */
export interface QuarterSummaryResultsProps {
  /** Array of quarterly goal IDs to display */
  quarterlyGoalIds: Id<'goals'>[];
  /** Year of the quarter being summarized */
  year: number;
  /** Quarter number (1-4) being summarized */
  quarter: number;
  /** Whether to include adhoc goals in the results */
  includeAdhocGoals?: boolean;
  /** Optional array of domain IDs to filter adhoc goals (can include 'UNCATEGORIZED') */
  adhocDomainIds?: (Id<'domains'> | 'UNCATEGORIZED')[];
  /** Actions available for goals in the summary */
  goalActions?: SummaryGoalActions;
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * Renders a comprehensive summary of quarterly goals including their weekly goals,
 * daily goals, and optionally adhoc goals organized by domain. Displays goal completion
 * status, details, and provides interactive actions.
 *
 * @example
 * ```tsx
 * <QuarterSummaryResults
 *   quarterlyGoalIds={selectedGoalIds}
 *   year={2025}
 *   quarter={4}
 *   includeAdhocGoals={true}
 *   adhocDomainIds={selectedDomainIds}
 *   goalActions={goalActions}
 * />
 * ```
 */
export function QuarterSummaryResults({
  quarterlyGoalIds,
  year,
  quarter,
  includeAdhocGoals,
  adhocDomainIds,
  goalActions,
  className,
}: QuarterSummaryResultsProps) {
  const { summaryData, isLoading, error } = useQuarterSummary({
    quarterlyGoalIds,
    year,
    quarter,
    includeAdhocGoals,
    adhocDomainIds,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <_QuarterSummaryResultsSkeleton />
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load quarter summary'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const quarterlyGoalCount = summaryData.quarterlyGoals.length;
  const adhocGoalCount = summaryData.adhocGoals?.length || 0;

  return (
    <div className={cn('space-y-8', className)}>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Q{quarter} {year} Summary
            </h1>
            <p className="text-sm text-muted-foreground">
              Summary of {quarterlyGoalCount} quarterly goal{quarterlyGoalCount !== 1 ? 's' : ''}
              {includeAdhocGoals
                ? ` and ${adhocGoalCount} adhoc goal${adhocGoalCount !== 1 ? 's' : ''}`
                : ''}
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
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                    Quarterly Goal {index + 1}
                  </span>
                  {isComplete && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <h2
                  className={cn(
                    'text-xl font-bold text-foreground mb-2 leading-tight',
                    isComplete && 'text-muted-foreground line-through'
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
                  <h3 className="text-lg font-semibold text-foreground">Weekly Goals</h3>
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

        {includeAdhocGoals && summaryData.adhocGoals && summaryData.adhocGoals.length > 0 && (
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  Adhoc Goals
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2 leading-tight">
                Adhoc Goals ({summaryData.adhocGoals.length})
              </h2>
            </div>

            <div className="space-y-4">
              {summaryData.adhocGoals.map((goal: Doc<'goals'>) => (
                <div key={goal._id} className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'font-medium',
                        goal.isComplete && 'line-through text-muted-foreground'
                      )}
                    >
                      {goal.title}
                    </div>
                    {goal.isComplete && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  {goal.details && (
                    <p className="text-sm text-muted-foreground mt-1">{goal.details}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Week {goal.adhoc?.weekNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for the QuarterSummaryResults component.
 */
function _QuarterSummaryResultsSkeleton() {
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
