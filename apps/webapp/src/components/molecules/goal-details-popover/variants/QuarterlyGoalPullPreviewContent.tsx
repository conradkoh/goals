/**
 * Quarterly Goal Pull Preview Content
 *
 * A full-page variant for displaying a quarterly goal's children from the last non-empty week.
 * This is specifically designed for the quarterly goal pull preview feature.
 *
 * @module
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { getQuarterWeeks } from '@workspace/backend/src/usecase/quarter';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { useMemo } from 'react';

import { GoalDetailsPageShell } from './GoalDetailsPageShell';
import { StandardGoalPopoverContent } from './StandardGoalPopoverContent';

import { GoalProvider } from '@/contexts/GoalContext';
import { WeekProvider } from '@/hooks/useWeek';
import { buildDashboardHref } from '@/lib/dashboard/dashboardUrlParams';
import { cn } from '@/lib/utils';

/**
 * Props for the QuarterlyGoalPullPreviewContent component.
 *
 * @public
 */
export interface QuarterlyGoalPullPreviewContentProps {
  /** The goal ID to display */
  goalId: Id<'goals'>;
  /** Year of the quarter */
  year: number;
  /** Quarter number (1-4) */
  quarter: 1 | 2 | 3 | 4;
}

/**
 * Full page component for displaying quarterly goal pull preview.
 * Shows only the children from the last non-empty week of the quarter.
 *
 * @public
 * @param props - Component props
 * @returns Rendered full page quarterly goal preview
 */
export function QuarterlyGoalPullPreviewContent({
  goalId,
  year,
  quarter,
}: QuarterlyGoalPullPreviewContentProps) {
  const goalDetails = useSessionQuery(
    api.goal.getGoalPullPreviewDetails,
    goalId ? { goalId, year, quarter } : 'skip'
  );

  const lastNonEmptyWeek = useMemo(() => {
    if (goalDetails?.lastNonEmptyWeek) {
      return goalDetails.lastNonEmptyWeek;
    }
    const { endWeek } = getQuarterWeeks(year, quarter);
    return endWeek;
  }, [goalDetails, year, quarter]);

  const mockWeekData = useMemo(() => {
    return {
      weekLabel: `W${lastNonEmptyWeek}`,
      weekNumber: lastNonEmptyWeek,
      mondayDate: '',
      year,
      quarter,
      days: [],
      tree: {
        weekNumber: lastNonEmptyWeek,
        allGoals: [],
        quarterlyGoals: [],
        weeklyGoals: [],
        dailyGoals: [],
        adhocGoals: [],
      },
    };
  }, [lastNonEmptyWeek, year, quarter]);

  const goalTitle = goalDetails?.title ?? 'Loading...';
  const dashboardHref = buildDashboardHref('quarterly', new URLSearchParams(), {
    year,
    quarter,
  });

  return (
    <GoalDetailsPageShell
      goalTitle={goalTitle}
      hasGoalDetails={Boolean(goalDetails)}
      contextBadgeLabel={`Q${quarter} ${year}`}
      isLoading={goalDetails === undefined}
      isNotFound={goalDetails === null}
      notFoundDescription="This goal may have been deleted, doesn't belong to the specified quarter, or you don't have access to it."
      dashboardHref={dashboardHref}
    >
      {goalDetails && (
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                )}
              >
                Quarterly Goal (Last Week Preview)
              </span>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                )}
              >
                Week {lastNonEmptyWeek}
              </span>
            </div>

            <WeekProvider weekData={mockWeekData}>
              <GoalProvider goal={goalDetails as unknown as GoalWithDetailsAndChildren}>
                <StandardGoalPopoverContent />
              </GoalProvider>
            </WeekProvider>
          </div>
        </div>
      )}
    </GoalDetailsPageShell>
  );
}
