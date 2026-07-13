import { api } from '@workspace/backend/convex/_generated/api';
import { DayOfWeek } from '@workspace/backend/src/constants';
import { useMutation, useQuery } from 'convex/react';
import { useConvex } from 'convex/react';
import { type ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { useGoalActions } from './useGoalActions';

import {
  PullGoalsPreviewDialog,
  type PreviewTask,
  type WeekRef,
} from '@/components/molecules/PullGoalsPreviewDialog';
import { toast } from '@/components/ui/use-toast';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { getDayName } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

interface UsePullGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
}

interface PullGoalsPreviewData {
  tasksFromPreviousWeek: PreviewTask[];
  tasksFromPastDays: PreviewTask[];
  totalTasks: number;
}

interface UsePullGoalsReturn {
  isPulling: boolean;
  hasPendingGoals: boolean;
  pendingGoalsCount: number;
  handlePullGoals: () => Promise<void>;
  dialog: ReactElement;
  /** The current From week (null when week 1 / no prior week in quarter). */
  fromWeek: WeekRef | null;
  /** The current To week (defaults to calendar current week). */
  toWeek: WeekRef;
  /** Update From week and refresh preview. */
  setFromWeek: (week: WeekRef) => void;
  /** Update To week, clamp/clear From if invalid, and refresh preview. */
  setToWeek: (week: WeekRef) => void;
  /** Jump From to the last non-empty week before the current To week (same quarter only). */
  jumpToLastNonEmptyWeek: () => Promise<void>;
  /** True while a Jump query or preview refresh is in flight. */
  isRefreshingPreview: boolean;
}

/**
 * Unified hook for pulling goals from:
 * 1. Previous week → Monday of target week (explicit From/To, never moveGoalsFromLastNonEmptyWeek)
 * 2. Past days of current week → Today
 *
 * Props are kept for caller compat but IGNORED for defaults/execution.
 * Defaults come from `useCurrentWeekInfo()`.
 */
export const usePullGoals = (_props: UsePullGoalsProps): UsePullGoalsReturn => {
  const { sessionId } = useSession();
  const { moveGoalsFromDay } = useGoalActions();
  const moveGoalsFromWeekMutation = useMutation(api.goal.moveGoalsFromWeek);
  const convex = useConvex();

  // Calendar current week — source of truth for defaults
  const {
    weekNumber: currentWeekNumber,
    weekYear,
    weekQuarter,
    weekday: currentDayOfWeek,
  } = useCurrentWeekInfo();

  const isMonday = currentDayOfWeek === DayOfWeek.MONDAY;

  // --- Derived defaults (stable across renders) ---
  const toDefault = useMemo<WeekRef>(
    () => ({
      year: weekYear,
      quarter: weekQuarter,
      weekNumber: currentWeekNumber,
    }),
    [weekYear, weekQuarter, currentWeekNumber]
  );

  const fromDefault = useMemo<WeekRef | null>(
    () =>
      currentWeekNumber > 1
        ? { year: weekYear, quarter: weekQuarter, weekNumber: currentWeekNumber - 1 }
        : null,
    [currentWeekNumber, weekYear, weekQuarter]
  );

  // --- State ---
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [previewData, setPreviewData] = useState<PullGoalsPreviewData | null>(null);

  // Editable From/To state (initialised lazily when dialog opens)
  const [fromWeek, setFromWeekState] = useState<WeekRef | null>(null);
  const [toWeek, setToWeekState] = useState<WeekRef | null>(null);

  // Stable refs for the preview/execute helpers (avoid stale closure reads)
  const fromWeekRef = useRef<WeekRef | null>(null);
  const toWeekRef = useRef<WeekRef | null>(null);

  // Current effective To (derived from state or default)
  const effectiveToWeek: WeekRef = toWeek ?? toDefault;

  const updateFromWeek = useCallback((week: WeekRef | null) => {
    setFromWeekState(week);
    fromWeekRef.current = week;
  }, []);

  const updateToWeek = useCallback((week: WeekRef) => {
    setToWeekState(week);
    toWeekRef.current = week;
  }, []);

  // --- Week options for dialog selects ---
  const weekOptions = useQuery(api.goal.getAvailableWeeks, {
    sessionId,
    currentWeek: {
      year: effectiveToWeek.year,
      quarter: effectiveToWeek.quarter,
      weekNumber: effectiveToWeek.weekNumber,
    },
  });

  // --- Helpers ---

  const getPastDaysOfWeek = useCallback((): DayOfWeek[] => {
    const pastDays: DayOfWeek[] = [];
    for (let day = DayOfWeek.MONDAY; day < currentDayOfWeek; day++) {
      pastDays.push(day as DayOfWeek);
    }
    return pastDays;
  }, [currentDayOfWeek]);

  /** Determine whether past-days preview/execute applies (To == calendar current week && not Monday). */
  const shouldPullPastDays = useCallback(
    (to: WeekRef): boolean => {
      return (
        !isMonday &&
        to.year === weekYear &&
        to.quarter === weekQuarter &&
        to.weekNumber === currentWeekNumber
      );
    },
    [isMonday, weekYear, weekQuarter, currentWeekNumber]
  );

  /**
   * Preview the week pull for a given From → To range.
   * Returns the list of tasks from the week pull (empty list if none or invalid range).
   */
  const previewWeekPull = useCallback(
    async (from: WeekRef | null, to: WeekRef): Promise<PreviewTask[]> => {
      if (!from || from.weekNumber >= to.weekNumber) return [];

      const result = await moveGoalsFromWeekMutation({
        sessionId,
        from,
        to: { ...to, dayOfWeek: DayOfWeek.MONDAY },
        dryRun: true,
      });

      if (!('canPull' in result) || !result.canPull) return [];

      const weekTasks: PreviewTask[] = result.dailyGoalsToMove.map((dailyGoal) => {
        const quarterlyStatus = result.quarterlyGoalsToUpdate.find(
          (q) => q.id === dailyGoal.quarterlyGoalId
        ) ?? { isStarred: false, isPinned: false };

        return {
          id: dailyGoal.id,
          title: dailyGoal.title,
          isComplete: false,
          quarterlyGoal: {
            id: dailyGoal.quarterlyGoalId ?? dailyGoal.weeklyGoalId,
            title: dailyGoal.quarterlyGoalTitle ?? dailyGoal.weeklyGoalTitle,
            isStarred: quarterlyStatus.isStarred,
            isPinned: quarterlyStatus.isPinned,
          },
          weeklyGoal: {
            id: dailyGoal.weeklyGoalId,
            title: dailyGoal.weeklyGoalTitle,
          },
        };
      });

      // Also add adhoc goals from the preview
      if (result.adhocGoalsToMove && result.adhocGoalsToMove.length > 0) {
        const adhocTasks: PreviewTask[] = result.adhocGoalsToMove.map((adhoc) => ({
          id: adhoc.id,
          title: adhoc.title,
          details: undefined,
          isComplete: false,
          quarterlyGoal: {
            id: 'adhoc',
            title: 'Adhoc Tasks',
            isStarred: false,
            isPinned: false,
          },
          weeklyGoal: {
            id: `adhoc-domain-${adhoc.domainId || 'uncategorized'}`,
            title: adhoc.domainName || 'Uncategorized',
          },
        }));
        weekTasks.push(...adhocTasks);
      }

      return weekTasks;
    },
    [sessionId, moveGoalsFromWeekMutation]
  );

  /**
   * Preview past-days pull for a target week.
   * Only applies when `to` matches the calendar current week and today is not Monday.
   */
  const previewPastDays = useCallback(
    async (to: WeekRef): Promise<PreviewTask[]> => {
      if (!shouldPullPastDays(to)) return [];

      const tasks: PreviewTask[] = [];
      const pastDays = getPastDaysOfWeek();

      for (const pastDay of pastDays) {
        const dayPreviewData = await moveGoalsFromDay({
          from: {
            year: to.year,
            quarter: to.quarter,
            weekNumber: to.weekNumber,
            dayOfWeek: pastDay,
          },
          to: {
            year: to.year,
            quarter: to.quarter,
            weekNumber: to.weekNumber,
            dayOfWeek: currentDayOfWeek,
          },
          dryRun: true,
          moveOnlyIncomplete: true,
        });

        if ('canMove' in dayPreviewData && dayPreviewData.canMove && dayPreviewData.tasks.length > 0) {
          tasks.push(...dayPreviewData.tasks);
        }
      }

      return tasks;
    },
    [shouldPullPastDays, getPastDaysOfWeek, moveGoalsFromDay, currentDayOfWeek]
  );

  /**
   * Refresh the preview from the current From/To refs.
   * Used after setFromWeek / setToWeek / jump changes.
   */
  const refreshPreview = useCallback(async () => {
    const from = fromWeekRef.current;
    const to = toWeekRef.current ?? toDefault;

    setIsRefreshingPreview(true);
    try {
      const [weekTasks, pastDayTasks] = await Promise.all([
        previewWeekPull(from, to),
        previewPastDays(to),
      ]);

      setPreviewData({
        tasksFromPreviousWeek: weekTasks,
        tasksFromPastDays: pastDayTasks,
        totalTasks: weekTasks.length + pastDayTasks.length,
      });
    } catch (error) {
      console.error('Failed to refresh preview:', error);
    } finally {
      setIsRefreshingPreview(false);
    }
  }, [toDefault, previewWeekPull, previewPastDays]);

  /**
   * Reset From/To to defaults, run preview, and open dialog.
   * Always opens the dialog (even if totalTasks === 0).
   */
  const handlePullGoals = useCallback(async () => {
    try {
      setIsPulling(true);

      // Reset to defaults from calendar
      const from = fromDefault;
      const to = toDefault;
      updateFromWeek(from);
      updateToWeek(to);

      // Run preview
      const [weekTasks, pastDayTasks] = await Promise.all([
        previewWeekPull(from, to),
        previewPastDays(to),
      ]);

      setPreviewData({
        tasksFromPreviousWeek: weekTasks,
        tasksFromPastDays: pastDayTasks,
        totalTasks: weekTasks.length + pastDayTasks.length,
      });

      // ALWAYS open dialog (even if 0 tasks)
      setShowDialog(true);
    } catch (error) {
      console.error('Failed to preview goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview goals to pull.',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  }, [fromDefault, toDefault, updateFromWeek, updateToWeek, previewWeekPull, previewPastDays]);

  /**
   * Execute the pull goals operation for the current From/To range.
   * Uses moveGoalsFromWeek with explicit from/to (never moveGoalsFromLastNonEmptyWeek).
   */
  const executePullGoals = useCallback(async () => {
    const from = fromWeekRef.current;
    const to = toWeekRef.current;
    if (!to) return;

    try {
      setIsPulling(true);

      // Step 1: Week pull (if valid range)
      if (from && from.weekNumber < to.weekNumber) {
        await moveGoalsFromWeekMutation({
          sessionId,
          from,
          to: { ...to, dayOfWeek: DayOfWeek.MONDAY },
          dryRun: false,
        });
      }

      // Step 2: Past-days pull (if applicable)
      if (shouldPullPastDays(to)) {
        const pastDays = getPastDaysOfWeek();

        for (const pastDay of pastDays) {
          await moveGoalsFromDay({
            from: {
              year: to.year,
              quarter: to.quarter,
              weekNumber: to.weekNumber,
              dayOfWeek: pastDay,
            },
            to: {
              year: to.year,
              quarter: to.quarter,
              weekNumber: to.weekNumber,
              dayOfWeek: currentDayOfWeek,
            },
            dryRun: false,
            moveOnlyIncomplete: true,
          });
        }
      }

      setShowDialog(false);
    } catch (error) {
      console.error('Failed to pull goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to pull goals.',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  }, [
    sessionId,
    moveGoalsFromWeekMutation,
    moveGoalsFromDay,
    shouldPullPastDays,
    getPastDaysOfWeek,
    currentDayOfWeek,
  ]);

  // ---- Public setters for slice 2 ----

  const setFromWeek = useCallback(
    async (week: WeekRef) => {
      updateFromWeek(week);
      await refreshPreview();
    },
    [updateFromWeek, refreshPreview]
  );

  const setToWeek = useCallback(
    async (week: WeekRef) => {
      const currentFrom = fromWeekRef.current;
      const sameQuarter =
        currentFrom &&
        currentFrom.year === week.year &&
        currentFrom.quarter === week.quarter;

      // Clamp/clear From if it would be >= To
      if (!sameQuarter || !currentFrom || currentFrom.weekNumber >= week.weekNumber) {
        updateFromWeek(
          week.weekNumber > 1
            ? { year: week.year, quarter: week.quarter, weekNumber: week.weekNumber - 1 }
            : null
        );
      }

      updateToWeek(week);
      await refreshPreview();
    },
    [updateFromWeek, updateToWeek, refreshPreview]
  );

  const jumpToLastNonEmptyWeek = useCallback(async () => {
    const to = toWeekRef.current;
    if (!to) return;

    setIsRefreshingPreview(true);
    try {
      const result = await convex.query(api.goal.findLastNonEmptyWeekBefore, {
        sessionId,
        before: to,
      });

      if (result) {
        updateFromWeek(result);
        // Refresh preview with the new From
        const fromVal = result;
        const [weekTasks, pastDayTasks] = await Promise.all([
          previewWeekPull(fromVal, to),
          previewPastDays(to),
        ]);
        setPreviewData({
          tasksFromPreviousWeek: weekTasks,
          tasksFromPastDays: pastDayTasks,
          totalTasks: weekTasks.length + pastDayTasks.length,
        });
      } else {
        toast({
          title: 'No earlier week found',
          description: 'No earlier week with incomplete goals in this quarter.',
        });
      }
    } catch (error) {
      console.error('Failed to find last non-empty week:', error);
      toast({
        title: 'Error',
        description: 'Failed to find earlier week.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingPreview(false);
    }
  }, [sessionId, convex, updateFromWeek, previewWeekPull, previewPastDays]);

  return {
    isPulling,
    hasPendingGoals: (previewData?.totalTasks ?? 0) > 0,
    pendingGoalsCount: previewData?.totalTasks ?? 0,
    handlePullGoals,
    fromWeek,
    toWeek: effectiveToWeek,
    setFromWeek,
    setToWeek,
    jumpToLastNonEmptyWeek,
    isRefreshingPreview,
    dialog: (
      <PullGoalsPreviewDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        fromWeek={fromWeek}
        toWeek={effectiveToWeek}
        tasksFromPreviousWeek={previewData?.tasksFromPreviousWeek ?? []}
        tasksFromPastDays={previewData?.tasksFromPastDays ?? []}
        showPastDaysSection={shouldPullPastDays(effectiveToWeek)}
        todayLabel={getDayName(currentDayOfWeek)}
        isRefreshingPreview={isRefreshingPreview}
        isPulling={isPulling}
        weekOptions={weekOptions ?? []}
        onFromWeekChange={setFromWeek}
        onToWeekChange={setToWeek}
        onJumpToLastNonEmpty={jumpToLastNonEmptyWeek}
        onConfirm={executePullGoals}
      />
    ),
  };
};
