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
import { ArrowLeft, Calendar, Home, Loader2, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { AdhocGoalPopoverContent } from './AdhocGoalPopoverContent';
import { QuarterlyGoalPopoverContent } from './QuarterlyGoalPopoverContent';
import { WeeklyGoalPageContent } from './WeeklyGoalPageContent';

import { Button } from '@/components/ui/button';
import { GoalProvider } from '@/contexts/GoalContext';
import { WeekProvider } from '@/hooks/useWeek';
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
  const router = useRouter();

  const quarter = useMemo(() => {
    if (quarterProp !== undefined) return quarterProp;
    return getQuarterFromWeek(weekNumber);
  }, [quarterProp, weekNumber]);

  // Fetch week data for context
  const weekData = useQuery(
    api.dashboard.getWeek,
    sessionId ? { sessionId, year, quarter, weekNumber } : 'skip'
  );

  // Fetch goal details
  const goalDetails = useQuery(
    api.dashboard.getGoalDetails,
    goalId && sessionId ? { sessionId, goalId } : 'skip'
  );

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/app');
    }
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.push('/app');
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    const params = new URLSearchParams();
    params.set('year', year.toString());
    params.set('quarter', quarter.toString());
    params.set('week', weekNumber.toString());
    params.set('viewMode', 'weekly');
    router.push(`/app?${params.toString()}`);
  }, [router, year, quarter, weekNumber]);

  const goalType = goalDetails
    ? getGoalType(goalDetails as unknown as GoalWithDetailsAndChildren)
    : null;
  const goalTitle = goalDetails?.title ?? 'Loading...';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoHome}
                  className="flex items-center gap-1 h-8 px-2 flex-shrink-0"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <span className="hidden sm:inline">/</span>
                <span className="hidden sm:inline">Goal</span>
                {goalDetails && (
                  <>
                    <span className="hidden sm:inline">/</span>
                    <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-xs">
                      {goalTitle}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Context Badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToDashboard}
                className="flex items-center gap-1.5 text-xs"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  W{weekNumber} · Q{quarter} {year}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Loading State */}
        {(weekData === undefined || goalDetails === undefined) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading goal details...</p>
          </div>
        )}

        {/* Not Found State */}
        {goalDetails === null && (
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Goal not found</h2>
            <p className="text-muted-foreground mb-6">
              This goal may have been deleted or you don't have access to it.
            </p>
            <Button onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        )}

        {/* Goal Content */}
        {weekData && goalDetails && goalType && (
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Goal Type Badge */}
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

              {/* Goal Content based on type */}
              <WeekProvider weekData={{ ...weekData, year, quarter }}>
                <GoalProvider goal={goalDetails as unknown as GoalWithDetailsAndChildren}>
                  {goalType === 'quarterly' && <QuarterlyGoalPopoverContent />}
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
      </div>
    </div>
  );
}
