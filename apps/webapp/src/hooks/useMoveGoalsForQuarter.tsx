/**
 * Hook for moving goals between quarters.
 *
 * Provides functionality to preview and execute moving incomplete goals
 * from a previous quarter to the current quarter.
 *
 * @module
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useAction } from 'convex/react';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

import { QuarterGoalMovePreview } from '@/components/molecules/quarter/QuarterGoalMovePreview';
import { toast } from '@/components/ui/use-toast';
import { useSession } from '@/modules/auth/useSession';

/**
 * Quarterly goal data for the move preview.
 *
 * @public
 */
export interface QuarterlyGoalToCopy {
  /** Goal identifier */
  id: Id<'goals'>;
  /** Goal title */
  title: string;
  /** Optional goal details/description */
  details?: string;
  /** Whether the goal is starred */
  isStarred: boolean;
  /** Whether the goal is pinned */
  isPinned: boolean;
}

/**
 * Weekly goal data for the move preview.
 *
 * @public
 */
export interface WeeklyGoalToCopy {
  /** Goal identifier */
  id: Id<'goals'>;
  /** Goal title */
  title: string;
  /** Optional goal details/description */
  details?: string;
  /** Parent quarterly goal ID */
  quarterlyGoalId: Id<'goals'>;
  /** Parent quarterly goal title */
  quarterlyGoalTitle: string;
}

/**
 * Daily goal data for the move preview.
 *
 * @public
 */
export interface DailyGoalToCopy {
  /** Goal identifier */
  id: Id<'goals'>;
  /** Goal title */
  title: string;
  /** Optional goal details/description */
  details?: string;
  /** Parent weekly goal ID */
  weeklyGoalId: Id<'goals'>;
  /** Parent weekly goal title */
  weeklyGoalTitle: string;
  /** Grandparent quarterly goal ID */
  quarterlyGoalId: Id<'goals'>;
  /** Grandparent quarterly goal title */
  quarterlyGoalTitle: string;
}

/**
 * Adhoc goal data for the move preview.
 *
 * @public
 */
export interface AdhocGoalToCopy {
  /** Goal identifier */
  id: Id<'goals'>;
  /** Goal title */
  title: string;
  /** Optional goal details/description */
  details?: string;
  /** Associated domain ID */
  domainId?: Id<'domains'>;
  /** Associated domain name for display */
  domainName?: string;
  /** Day of week (1-7) if assigned to a specific day */
  dayOfWeek?: number;
  /** Due date timestamp */
  dueDate?: number;
}

/**
 * Props for the useMoveGoalsForQuarter hook.
 *
 * @public
 */
export interface UseMoveGoalsForQuarterProps {
  /** Target year to move goals to */
  year: number;
  /** Target quarter to move goals to (1-4) */
  quarter: number;
}

/**
 * Return value from the useMoveGoalsForQuarter hook.
 *
 * @public
 */
export interface UseMoveGoalsForQuarterReturn {
  /** Whether this is the first quarter (no previous quarter to pull from) */
  isFirstQuarter: boolean;
  /** Whether the move operation is in progress */
  isMovingGoals: boolean;
  /** Whether the hook actions are disabled */
  isDisabled: boolean;
  /** Whether the confirmation dialog is visible */
  showConfirmDialog: boolean;
  /** Setter for the confirmation dialog visibility */
  setShowConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
  /** Preview data of goals to be moved */
  preview: GoalMovePreview | null;
  /** Initiates the preview flow */
  handlePreviewGoals: () => Promise<void>;
  /** Executes the move operation */
  handleMoveGoals: (
    selectedQuarterlyGoalIds?: Id<'goals'>[],
    selectedAdhocGoalIds?: Id<'goals'>[]
  ) => Promise<void>;
  /** Pre-rendered dialog component */
  dialog: React.ReactNode;
}

/**
 * Preview data structure for goals to be moved.
 *
 * @internal
 */
interface GoalMovePreview {
  quarterlyGoals: QuarterlyGoalToCopy[];
  weeklyGoals: WeeklyGoalToCopy[];
  dailyGoals: DailyGoalToCopy[];
  adhocGoals: AdhocGoalToCopy[];
}

/**
 * Hook for managing the move goals from previous quarter workflow.
 * Provides preview functionality, selection, and execution of the move.
 *
 * @public
 * @param props - Hook configuration
 * @returns Object containing state and handlers for moving goals
 *
 * @example
 * ```tsx
 * const {
 *   handlePreviewGoals,
 *   dialog,
 *   isDisabled
 * } = useMoveGoalsForQuarter({ year: 2025, quarter: 2 });
 *
 * return (
 *   <>
 *     <Button onClick={handlePreviewGoals} disabled={isDisabled}>
 *       Pull from Previous Quarter
 *     </Button>
 *     {dialog}
 *   </>
 * );
 * ```
 */
export function useMoveGoalsForQuarter({
  year,
  quarter,
}: UseMoveGoalsForQuarterProps): UseMoveGoalsForQuarterReturn {
  const { sessionId } = useSession();
  const [isMovingGoals, setIsMovingGoals] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const moveGoalsAction = useAction(api.goal.moveGoalsFromQuarter);

  const isFirstQuarter = quarter === 1 && year === new Date().getFullYear() - 1;
  const isDisabled = isMovingGoals || isFirstQuarter;

  const getPreviousQuarter = useCallback(() => {
    if (quarter === 1) {
      return { year: year - 1, quarter: 4 };
    }
    return { year, quarter: (quarter - 1) as 1 | 2 | 3 | 4 };
  }, [year, quarter]);

  const prevQuarter = useMemo(() => getPreviousQuarter(), [getPreviousQuarter]);

  // Subscribe to the preview query for reactive updates
  // Only query when the dialog is open to avoid unnecessary data fetching
  const previewData = useSessionQuery(
    showConfirmDialog ? api.goal.getQuarterGoalsMovePreview : 'skip',
    showConfirmDialog
      ? {
          from: {
            year: prevQuarter.year,
            quarter: prevQuarter.quarter,
          },
          to: {
            year,
            quarter,
          },
        }
      : 'skip'
  );

  // Determine loading state: dialog is open but data hasn't arrived yet
  const isPreviewLoading = showConfirmDialog && previewData === undefined;

  // Transform the query data into the preview format
  const preview: GoalMovePreview | null = useMemo(() => {
    if (!previewData) return null;
    return {
      quarterlyGoals: previewData.quarterlyGoalsToCopy || [],
      weeklyGoals: [],
      dailyGoals: [],
      adhocGoals: previewData.adhocGoalsToCopy || [],
    };
  }, [previewData]);

  const handlePreviewGoals = useCallback(async () => {
    if (isFirstQuarter) return;

    if (!sessionId) {
      toast({
        title: 'Error',
        description: 'User not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    // Simply open the dialog - the query will handle fetching the preview data
    setShowConfirmDialog(true);
  }, [isFirstQuarter, sessionId]);

  const handleMoveGoals = useCallback(
    async (selectedQuarterlyGoalIds?: Id<'goals'>[], selectedAdhocGoalIds?: Id<'goals'>[]) => {
      if (isFirstQuarter) return;

      try {
        setIsMovingGoals(true);

        if (!sessionId) {
          throw new Error('User not authenticated');
        }

        await moveGoalsAction({
          sessionId,
          from: {
            year: prevQuarter.year,
            quarter: prevQuarter.quarter,
          },
          to: {
            year,
            quarter,
          },
          selectedQuarterlyGoalIds,
          selectedAdhocGoalIds,
        });

        setShowConfirmDialog(false);
        toast({
          title: 'Success',
          description: 'Goals have been pulled to this quarter.',
        });
      } catch (error) {
        console.error('Failed to move goals from previous quarter:', error);
        toast({
          title: 'Error',
          description: 'Failed to move goals from previous quarter.',
          variant: 'destructive',
        });
      } finally {
        setIsMovingGoals(false);
      }
    },
    [isFirstQuarter, prevQuarter, sessionId, moveGoalsAction, year, quarter]
  );

  const dialog = (
    <QuarterGoalMovePreview
      open={showConfirmDialog}
      onOpenChange={setShowConfirmDialog}
      preview={preview}
      onConfirm={handleMoveGoals}
      isConfirming={isMovingGoals}
      isLoading={isPreviewLoading}
      sourceYear={prevQuarter.year}
      sourceQuarter={prevQuarter.quarter}
    />
  );

  return {
    isFirstQuarter,
    isMovingGoals,
    isDisabled,
    showConfirmDialog,
    setShowConfirmDialog,
    preview,
    handlePreviewGoals,
    handleMoveGoals,
    dialog,
  };
}

export default useMoveGoalsForQuarter;
