/**
 * Goal Page Content
 *
 * A full-page variant for displaying goal details with complete interactivity.
 * Designed to be used on a dedicated goal page route rather than in a popover/modal.
 *
 * Supports both quarterly and adhoc goals, with appropriate content for each type.
 *
 * @module
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

import { AdhocGoalPopoverContent } from './AdhocGoalPopoverContent';
import { GoalDetailsPageShell } from './GoalDetailsPageShell';
import { StandardGoalPopoverContent } from './StandardGoalPopoverContent';
import { WeeklyGoalPageContent } from './WeeklyGoalPageContent';

import { GoalProvider } from '@/contexts/GoalContext';
import { WeekProvider } from '@/hooks/useWeek';
import { buildDashboardHref } from '@/lib/dashboard/dashboardUrlParams';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the GoalPageContent component.
 *
 * @public
 */
export interface GoalPageContentProps {
  /** The goal ID to display */
  goalId: Id<'goals'>;
  /** Year for context (ISO week year) */
  year: number;
  /** Week number for context */
  weekNumber: number;
  /** Optional quarter override (derived from week if not provided) */
  quarter?: 1 | 2 | 3 | 4;
}

/**
 * Helper to determine quarter from week number.
 * Uses standard ISO week-based quarter assignment.
 */
function getQuarterFromWeek(weekNumber: number): 1 | 2 | 3 | 4 {
  if (weekNumber <= 13) return 1;
  if (weekNumber <= 26) return 2;
  if (weekNumber <= 39) return 3;
  return 4;
}

/**
 * Determines the goal type based on the goal's depth property.
 * - depth 0: quarterly
 * - depth 1: weekly
 * - depth 2: daily
 * - adhoc goals have a different structure
 */
function getGoalType(goal: GoalWithDetailsAndChildren): 'quarterly' | 'weekly' | 'daily' | 'adhoc' {
  if (goal.adhoc) return 'adhoc';
  if (goal.depth === 0) return 'quarterly';
  if (goal.depth === 1) return 'weekly';
  return 'daily';
}

/**
 * Full page component for displaying goal details with navigation header.
 * Fetches week data and goal details, then renders the appropriate content
 * based on goal type with full interactivity.
 *
 * @public
 * @param props - Component props
 * @returns Rendered full page goal view
 */
export function GoalPageContent({
  goalId,
  year,
  weekNumber,
  quarter: quarterProp,
}: GoalPageContentProps) {
  const { sessionId } = useSession();

  const quarter = useMemo(() => {
    if (quarterProp !== undefined) return quarterProp;
    return getQuarterFromWeek(weekNumber);
  }, [quarterProp, weekNumber]);

  const weekData = useQuery(
    api.dashboard.getWeek,
    sessionId ? { sessionId, year, quarter, weekNumber } : 'skip'
  );

  const goalDetails = useQuery(
    api.dashboard.getGoalDetails,
    goalId && sessionId ? { sessionId, goalId } : 'skip'
  );

  const goalType = goalDetails
    ? getGoalType(goalDetails as unknown as GoalWithDetailsAndChildren)
    : null;
  const goalTitle = goalDetails?.title ?? 'Loading...';
  const dashboardHref = buildDashboardHref('weekly', new URLSearchParams(), {
    year,
    week: weekNumber,
  });

  return (
    <GoalDetailsPageShell
      goalTitle={goalTitle}
      hasGoalDetails={Boolean(goalDetails)}
      contextBadgeLabel={`W${weekNumber} · Q${quarter} ${year}`}
      isLoading={weekData === undefined || goalDetails === undefined}
      isNotFound={goalDetails === null}
      notFoundDescription="This goal may have been deleted or you don't have access to it."
      dashboardHref={dashboardHref}
    >
      {weekData && goalDetails && goalType && (
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                  goalType === 'quarterly' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                  goalType === 'weekly' &&
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                  goalType === 'daily' &&
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                  goalType === 'adhoc' &&
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                )}
              >
                {goalType === 'quarterly' && 'Quarterly Goal'}
                {goalType === 'weekly' && 'Weekly Goal'}
                {goalType === 'daily' && 'Daily Goal'}
                {goalType === 'adhoc' && 'Adhoc Task'}
              </span>
            </div>

            <WeekProvider weekData={{ ...weekData, year, quarter }}>
              <GoalProvider goal={goalDetails as unknown as GoalWithDetailsAndChildren}>
                {goalType === 'quarterly' && <StandardGoalPopoverContent />}
                {goalType === 'weekly' && <WeeklyGoalPageContent />}
                {goalType === 'adhoc' && <AdhocGoalPopoverContent weekNumber={weekNumber} />}
                {goalType === 'daily' && (
                  <div className="text-muted-foreground text-center py-8">
                    Daily goal view coming soon
                  </div>
                )}
              </GoalProvider>
            </WeekProvider>
          </div>
        </div>
      )}
    </GoalDetailsPageShell>
  );
}
