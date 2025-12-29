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
import { ArrowLeft, Calendar, Home, Loader2, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { QuarterlyGoalPopoverContent } from './QuarterlyGoalPopoverContent';

import { Button } from '@/components/ui/button';
import { GoalProvider } from '@/contexts/GoalContext';
import { WeekProvider } from '@/hooks/useWeek';
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
  const router = useRouter();

  // Fetch goal details with year and quarter context
  const goalDetails = useSessionQuery(
    api.dashboard.getGoalPullPreviewDetails,
    goalId ? { goalId, year, quarter } : 'skip'
  );

  // Get the last non-empty week from the backend response
  const lastNonEmptyWeek = useMemo(() => {
    if (goalDetails?.lastNonEmptyWeek) {
      return goalDetails.lastNonEmptyWeek;
    }
    // Fallback to the last week of the quarter if not provided
    const { endWeek } = getQuarterWeeks(year, quarter);
    return endWeek;
  }, [goalDetails, year, quarter]);

  // Create mock week data for the WeekProvider
  // We use the last non-empty week as context
  const mockWeekData = useMemo(() => {
    return {
      weekLabel: `W${lastNonEmptyWeek}`,
      weekNumber: lastNonEmptyWeek,
      mondayDate: '', // Not used in read-only preview
      year,
      quarter,
      days: [], // Not used in read-only preview
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
    params.set('viewMode', 'quarterly');
    router.push(`/app?${params.toString()}`);
  }, [router, year, quarter]);

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
                  Q{quarter} {year}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Loading State */}
        {goalDetails === undefined && (
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
              This goal may have been deleted, doesn't belong to the specified quarter, or you don't
              have access to it.
            </p>
            <Button onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        )}

        {/* Goal Content */}
        {goalDetails && (
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Goal Type Badge and Week Info */}
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

              {/* Goal Content */}
              <WeekProvider weekData={mockWeekData}>
                <GoalProvider goal={goalDetails as unknown as GoalWithDetailsAndChildren}>
                  <QuarterlyGoalPopoverContent />
                </GoalProvider>
              </WeekProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
