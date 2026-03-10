'use client';

/**
 * FocusModeFocusedView organism component.
 *
 * A two-section focused view:
 * 1. Global scratchpad — rich text editor with auto-save and archive ("New") support
 * 2. Today's adhoc items — live clock-driven list of today's adhoc goals
 *
 * Layout:
 * - Mobile: stacked vertically (scratchpad on top, tasks below)
 * - Desktop (md+): side-by-side — scratchpad takes 2/3, tasks take 1/3
 *
 * @module FocusModeFocusedView
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { History, Loader2, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

import {
  FocusedAdhocGoalsSection,
  FocusedDailyGoalsSection,
  FocusedUrgentSection,
  FocusedWeeklyGoalsSection,
} from '@/components/organisms/focus/focused-view';
import { ScratchpadHistoryDialog } from '@/components/organisms/focus/ScratchpadHistoryDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useScratchpad } from '@/hooks/useScratchpad';
import { useWeekData, WeekProvider } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

// ============================================================================
// FocusModeFocusedView
// ============================================================================

/**
 * FocusModeFocusedView — shows a global scratchpad and today's adhoc tasks.
 *
 * @example
 * ```tsx
 * <FocusModeFocusedView />
 * ```
 */
export function FocusModeFocusedView() {
  // ── History dialog ─────────────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Scratchpad ─────────────────────────────────────────────────────────
  const {
    initialContent,
    editorRef,
    saveStatus,
    isReady: isContentInitialized,
    handleContentChange,
    handleNewClick,
    handleArchiveConfirm,
    showArchiveConfirm,
    setShowArchiveConfirm,
  } = useScratchpad();

  // ── Today's date (refreshes every 10s) ──────────────────────────────────
  const [currentDate, setCurrentDate] = useState<DateTime>(() => DateTime.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(DateTime.now());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const year = currentDate.weekYear;
  const weekNumber = currentDate.weekNumber;
  const quarter = getQuarterFromWeek(weekNumber);
  const dayOfWeek = currentDate.weekday as DayOfWeek; // 1 = Monday … 7 = Sunday

  const formattedDate = currentDate.toFormat('cccc, MMMM d'); // e.g. "Monday, March 2"

  // ── Week data (needed by GoalActionMenuNew via WeekProvider) ──────────
  const weekData = useWeekData({ year, quarter, week: weekNumber });

  // ── BFF: Consolidated focused view data ─────────────────────────────────
  const focusedViewData = useSessionQuery(api.bff.focus.getFocusedViewData, {
    year,
    quarter,
    weekNumber,
    dayOfWeek,
  });

  // ── Goal mutations ──────────────────────────────────────────────────────
  const createAdhocGoal = useSessionMutation(api.adhocGoal.createAdhocGoal);
  const updateAdhocGoal = useSessionMutation(api.adhocGoal.updateAdhocGoal);
  const toggleGoalCompletion = useSessionMutation(api.dashboard.toggleGoalCompletion);

  const handleAdhocCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      try {
        await updateAdhocGoal({ goalId, isComplete });
      } catch (error) {
        console.error('Failed to update goal completion:', error);
      }
    },
    [updateAdhocGoal]
  );

  const handleNormalGoalCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      try {
        await toggleGoalCompletion({ goalId, weekNumber, isComplete });
      } catch (error) {
        console.error('Failed to toggle goal completion:', error);
      }
    },
    [toggleGoalCompletion, weekNumber]
  );

  const handleUrgentCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      const goal = focusedViewData?.urgent.find((g) => g._id === goalId);
      if (!goal) return;
      if (goal.isAdhoc) {
        await handleAdhocCompleteChange(goalId, isComplete);
      } else {
        await handleNormalGoalCompleteChange(goalId, isComplete);
      }
    },
    [focusedViewData?.urgent, handleAdhocCompleteChange, handleNormalGoalCompleteChange]
  );

  // ── Add task ─────────────────────────────────────────────────────────────
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleAddTask = useCallback(async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    setIsAddingTask(true);
    try {
      await createAdhocGoal({
        title,
        year,
        weekNumber,
        dayOfWeek,
      });
      setNewTaskTitle('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsAddingTask(false);
    }
  }, [newTaskTitle, createAdhocGoal, year, weekNumber, dayOfWeek]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-0 h-full md:overflow-hidden">
      {/* ── Scratchpad section — 2/3 on desktop, full on mobile ─────────── */}
      <div className="flex-1 md:flex-[2] border-b md:border-b-0 md:border-r border-border flex flex-col md:min-h-0 md:overflow-hidden">
        <div className="flex flex-col h-full md:min-h-0 md:overflow-hidden">
          {/* Industrial header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Scratchpad
            </h2>
            <div className="flex items-center gap-3">
              {/* Save status dot indicator */}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Saving
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="w-1.5 h-1.5 bg-emerald-400" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  <span className="w-1.5 h-1.5 bg-red-400" />
                  Error
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewClick}
                className="text-xs uppercase tracking-wider font-bold"
              >
                New
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="text-xs uppercase tracking-wider font-bold"
              >
                <History className="h-3.5 w-3.5 mr-1" />
                History
              </Button>
            </div>
          </div>

          {/* Editor — flex-1 to fill height */}
          <div className="flex-1 md:min-h-0 md:overflow-hidden min-h-[300px]">
            {!isContentInitialized ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RichTextEditor
                value={initialContent}
                onChange={handleContentChange}
                editorRef={editorRef}
                placeholder="Start writing..."
                className="min-h-[300px] md:min-h-0"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Today's tasks section — 1/3 on desktop, full on mobile ─────── */}
      <div className="md:w-80 flex flex-col md:min-h-0 md:overflow-y-auto">
        {/* Industrial header */}
        <div className="px-4 py-3 border-b-2 border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Today&apos;s Tasks
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {!weekData || !focusedViewData ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WeekProvider weekData={weekData}>
            <FocusedUrgentSection
              goals={focusedViewData.urgent}
              onToggleComplete={handleUrgentCompleteChange}
            />

            <FocusedWeeklyGoalsSection
              goals={focusedViewData.weeklyGoals}
              onToggleComplete={handleNormalGoalCompleteChange}
            />

            <FocusedDailyGoalsSection
              goals={focusedViewData.dailyGoals}
              onToggleComplete={handleNormalGoalCompleteChange}
            />

            <FocusedAdhocGoalsSection
              goals={focusedViewData.adhocTasks}
              onToggleComplete={handleAdhocCompleteChange}
            />

            {/* Inline add task */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  placeholder="Add a task..."
                  disabled={isAddingTask}
                  className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </WeekProvider>
        )}
      </div>

      <ScratchpadHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />

      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive &amp; Start Fresh</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive your current scratchpad content and start a new one. You can find
              archived content in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
