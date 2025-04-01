import React, { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { DayOfWeek } from '@services/backend/src/constants';
import { useSession } from '@/modules/auth/useSession';
import { toast } from '../components/ui/use-toast';
import { Id } from '@services/backend/convex/_generated/dataModel';
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
  const moveGoalsFromQuarterMutation = useMutation(
    api.goal.moveGoalsFromQuarter
  );
  const [isMovingGoals, setIsMovingGoals] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    quarterlyGoals: QuarterlyGoalToCopy[];
    weeklyGoals: WeeklyGoalToCopy[];
    dailyGoals: DailyGoalToCopy[];
  } | null>(null);

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

      const previewData = await moveGoalsFromQuarterMutation({
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

      setPreview({
        quarterlyGoals: previewData.quarterlyGoalsToCopy || [],
        weeklyGoals: previewData.weeklyGoalsToCopy || [],
        dailyGoals: previewData.dailyGoalsToCopy || [],
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

      const result = await moveGoalsFromQuarterMutation({
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
        description: `Moved incomplete goals from Q${prevQuarter.quarter} ${prevQuarter.year} to Q${quarter} ${year}.`,
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
