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
 * - Desktop (md+): side-by-side — scratchpad takes remaining space, tasks panel is fixed-width (30rem)
 *
 * @module FocusModeFocusedView
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { History, Loader2, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

import { CreateQuarterlyGoalDialog } from '@/components/molecules/focus/CreateQuarterlyGoalDialog';
import {
  FocusedAdhocGoalsSection,
  FocusedQuarterlyGoalsSection,
  FocusedUrgentSection,
} from '@/components/organisms/focus/focused-view';
import { removeCompletedItemsFromEditor } from '@/components/organisms/focus/removeCompletedItems';
import { ScratchpadHistoryDialog } from '@/components/organisms/focus/ScratchpadHistoryDialog';
import { ScratchpadNewDialog } from '@/components/organisms/focus/ScratchpadNewDialog';
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
  const [isCreateQuarterlyGoalOpen, setIsCreateQuarterlyGoalOpen] = useState(false);

  // ── Scratchpad ─────────────────────────────────────────────────────────
  const {
    initialContent,
    editorRef,
    saveStatus,
    isReady: isContentInitialized,
    handleContentChange,
    handleNewClick,
    handleArchiveConfirm,
    handleRemoveCompletedItems,
    showNewDialog,
    setShowNewDialog,
  } = useScratchpad();

  const hasCompletedItems = (() => {
    const content = editorRef.current?.getContent() ?? '';
    return content.includes('data-checked="true"');
  })();

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

  // ── Scratchpad actions ───────────────────────────────────────────────────
  const onClearScratchpad = useCallback(() => {
    handleArchiveConfirm();
  }, [handleArchiveConfirm]);

  const onRemoveCompletedItems = useCallback(() => {
    const cleanedContent = removeCompletedItemsFromEditor(editorRef);
    if (cleanedContent !== null) {
      handleRemoveCompletedItems(cleanedContent);
    }
  }, [editorRef, handleRemoveCompletedItems]);

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
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                  Saving
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="w-1.5 h-1.5 bg-success" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  <span className="w-1.5 h-1.5 bg-destructive" />
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
                className="min-h-[300px] md:min-h-0 dark:prose-invert"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Today's tasks section — wider panel on desktop, full on mobile ─ */}
      <div className="md:w-[30rem] flex flex-col md:min-h-0 md:overflow-y-auto">
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

            <FocusedQuarterlyGoalsSection
              goals={focusedViewData.quarterlyGoals}
              onToggleComplete={handleNormalGoalCompleteChange}
              onAddGoal={() => setIsCreateQuarterlyGoalOpen(true)}
            />

            <CreateQuarterlyGoalDialog
              open={isCreateQuarterlyGoalOpen}
              onOpenChange={setIsCreateQuarterlyGoalOpen}
              year={year}
              quarter={quarter}
              weekNumber={weekNumber}
            />

            <FocusedAdhocGoalsSection
              goals={focusedViewData.adhocTasks}
              onToggleComplete={handleAdhocCompleteChange}
            />

            {/* Inline add task */}
            <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              <div className="flex items-center gap-2 border border-border/60 rounded-md bg-background/50 px-3 py-2 transition-colors hover:bg-background/80 focus-within:bg-background focus-within:border-border">
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || isAddingTask}
                  className="flex-shrink-0 h-5 w-5 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Add task"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
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
                  className="h-6 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </WeekProvider>
        )}
      </div>

      <ScratchpadHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />

      <ScratchpadNewDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onClearScratchpad={onClearScratchpad}
        onRemoveCompletedItems={onRemoveCompletedItems}
        hasCompletedItems={hasCompletedItems}
      />
    </div>
  );
}
