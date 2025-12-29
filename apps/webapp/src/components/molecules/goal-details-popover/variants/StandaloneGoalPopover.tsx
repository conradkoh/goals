/**
 * Standalone Goal Popover
 *
 * A self-contained modal that displays goal details with full interactivity.
 * Unlike the regular popovers which rely on WeekProvider being set up by a parent,
 * this component fetches its own week data and sets up the required context.
 *
 * Use cases:
 * - Viewing goals from a previous quarter (e.g., in the pull goals dialog)
 * - Opening goals from search results or notifications
 * - Any context where WeekProvider is not already available
 *
 * @module
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { getQuarterWeeks } from '@workspace/backend/src/usecase/quarter';
import { useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { AdhocGoalPopoverContent } from './AdhocGoalPopoverContent';
import { QuarterlyGoalPopoverContent } from './QuarterlyGoalPopoverContent';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoalProvider } from '@/contexts/GoalContext';
import { WeekProvider } from '@/hooks/useWeek';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the StandaloneGoalPopover component.
 *
 * @public
 */
export interface StandaloneGoalPopoverProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback fired when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** The goal ID to display, or null if no goal selected */
  goalId: Id<'goals'> | null;
  /** Type of goal being displayed */
  goalType: 'quarterly' | 'adhoc';
  /** Year of the goal's quarter */
  year: number;
  /** Quarter number (1-4) */
  quarter: number;
  /** Optional week number (defaults to last week of quarter) */
  weekNumber?: number;
  /** Callback fired when the goal is marked as complete */
  onComplete?: () => void;
}

/**
 * A standalone modal that provides its own WeekProvider context.
 * Fetches week data for the specified quarter and renders the goal
 * with full interactivity including editing, completion, and child management.
 *
 * @public
 * @param props - Component props
 * @returns Rendered modal with goal details, or null if no goalId
 */
export function StandaloneGoalPopover({
  open,
  onOpenChange,
  goalId,
  goalType,
  year,
  quarter,
  weekNumber: weekNumberProp,
  onComplete,
}: StandaloneGoalPopoverProps) {
  const { sessionId } = useSession();

  const weekNumber = useMemo(() => {
    if (weekNumberProp !== undefined) return weekNumberProp;
    const { endWeek } = getQuarterWeeks(year, quarter);
    return endWeek;
  }, [year, quarter, weekNumberProp]);

  const weekData = useQuery(
    api.dashboard.getWeek,
    open && sessionId ? { sessionId, year, quarter, weekNumber } : 'skip'
  );

  const goalDetails = useQuery(
    api.dashboard.getGoalDetails,
    open && goalId && sessionId ? { sessionId, goalId } : 'skip'
  );

  if (!goalId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[450px] max-w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="sr-only">Goal Details</DialogTitle>
        </DialogHeader>

        {(weekData === undefined || goalDetails === undefined) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {goalDetails === null && (
          <div className="py-8 text-center text-muted-foreground">Goal not found</div>
        )}

        {weekData && goalDetails && (
          <WeekProvider weekData={{ ...weekData, year, quarter }}>
            <GoalProvider goal={goalDetails as unknown as GoalWithDetailsAndChildren}>
              {goalType === 'quarterly' ? (
                <QuarterlyGoalPopoverContent onComplete={onComplete} />
              ) : (
                <AdhocGoalPopoverContent onComplete={onComplete} weekNumber={weekNumber} />
              )}
            </GoalProvider>
          </WeekProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
