import React, { useState, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { DayOfWeek } from '@services/backend/src/constants';
import { useSession } from '@/modules/auth/useSession';
import { toast } from '../components/ui/use-toast';
import { QuarterGoalMovePreview } from '@/components/molecules/quarter/QuarterGoalMovePreview';

// Types for the return values from the preview call
export type QuarterlyGoalToCopy = {
  id: Id<'goals'>;
  title: string;
  details?: string;
  isStarred: boolean;
  isPinned: boolean;
};

export type WeeklyGoalToCopy = {
  id: Id<'goals'>;
  title: string;
  details?: string;
  quarterlyGoalId: Id<'goals'>;
  quarterlyGoalTitle: string;
};

export type DailyGoalToCopy = {
  id: Id<'goals'>;
  title: string;
  details?: string;
  weeklyGoalId: Id<'goals'>;
  weeklyGoalTitle: string;
  quarterlyGoalId: Id<'goals'>;
  quarterlyGoalTitle: string;
};

interface UseMoveGoalsForQuarterProps {
  year: number;
  quarter: number;
}

interface UseMoveGoalsForQuarterReturn {
  isFirstQuarter: boolean;
  isMovingGoals: boolean;
  isDisabled: boolean;
  showConfirmDialog: boolean;
  setShowConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
  preview: {
    quarterlyGoals: QuarterlyGoalToCopy[];
    weeklyGoals: WeeklyGoalToCopy[];
    dailyGoals: DailyGoalToCopy[];
  } | null;
  handlePreviewGoals: () => Promise<void>;
  handleMoveGoals: () => Promise<void>;
  dialog: React.ReactNode;
}

export const useMoveGoalsForQuarter = ({
  year,
  quarter,
}: UseMoveGoalsForQuarterProps): UseMoveGoalsForQuarterReturn => {
  const { sessionId } = useSession();
  const [isMovingGoals, setIsMovingGoals] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    quarterlyGoals: QuarterlyGoalToCopy[];
    weeklyGoals: WeeklyGoalToCopy[];
    dailyGoals: DailyGoalToCopy[];
  } | null>(null);

  // Use the Convex action to move goals
  const moveGoalsAction = useAction(api.goal.moveGoalsFromQuarter);

  // Determine if this is the first quarter
  const isFirstQuarter = quarter === 1 && year === new Date().getFullYear() - 1;
  const isDisabled = isMovingGoals || isFirstQuarter;

  // Calculate previous quarter
  const getPreviousQuarter = useCallback(() => {
    if (quarter === 1) {
      return { year: year - 1, quarter: 4 };
    } else {
      return { year, quarter: (quarter - 1) as 1 | 2 | 3 | 4 };
    }
  }, [year, quarter]);

  const handlePreviewGoals = async () => {
    if (isFirstQuarter) return;
    try {
      const prevQuarter = getPreviousQuarter();

      if (!sessionId) {
        throw new Error('User not authenticated');
      }

      // Use the new action instead of the mutation
      const previewData = await moveGoalsAction({
        sessionId,
        from: {
          year: prevQuarter.year,
          quarter: prevQuarter.quarter,
        },
        to: {
          year,
          quarter,
        },
        dryRun: true,
      });

      // Adapt the response format for backward compatibility
      setPreview({
        quarterlyGoals: previewData.quarterlyGoalsToCopy || [],
        // Since our new implementation only shows quarterly goals,
        // provide empty arrays for weekly and daily goals
        weeklyGoals: [],
        dailyGoals: [],
      });
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Failed to preview goals from previous quarter:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview goals from previous quarter.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveGoals = async () => {
    if (isFirstQuarter) return;
    try {
      setIsMovingGoals(true);
      const prevQuarter = getPreviousQuarter();

      if (!sessionId) {
        throw new Error('User not authenticated');
      }

      // Use the new action instead of the mutation
      const result = await moveGoalsAction({
        sessionId,
        from: {
          year: prevQuarter.year,
          quarter: prevQuarter.quarter,
        },
        to: {
          year,
          quarter,
        },
        dryRun: false,
      });

      setShowConfirmDialog(false);
      toast({
        title: 'Goals moved',
        description: `Moved incomplete goals from the final week of Q${prevQuarter.quarter} ${prevQuarter.year} to Q${quarter} ${year}.`,
        variant: 'default',
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
  };

  // Render the dialog component
  const dialog = (
    <QuarterGoalMovePreview
      open={showConfirmDialog}
      onOpenChange={setShowConfirmDialog}
      preview={preview}
      onConfirm={handleMoveGoals}
      isConfirming={isMovingGoals}
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
};

export default useMoveGoalsForQuarter;
