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
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FocusedAdhocGoalsSection,
  FocusedDailyGoalsSection,
  FocusedUrgentSection,
  FocusedWeeklyGoalsSection,
} from '@/components/organisms/focus/focused-view';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { isHTMLEmpty, RichTextEditor } from '@/components/ui/rich-text-editor';
import { SafeHTML } from '@/components/ui/safe-html';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWeekData, WeekProvider } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

// ============================================================================
// Types
// ============================================================================

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================================================
// Helpers
// ============================================================================

function groupArchivesByDay(
  archives: { _id: string; content?: string; archivedAt: number }[]
): { dateLabel: string; items: typeof archives }[] {
  const groups = new Map<string, typeof archives>();

  for (const archive of archives) {
    const dt = DateTime.fromMillis(archive.archivedAt);
    const dateKey = dt.toFormat('yyyy-MM-dd');

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(archive);
  }

  return Array.from(groups.entries()).map(([, items]) => {
    const dt = DateTime.fromMillis(items[0].archivedAt);
    const today = DateTime.now().startOf('day');
    const archiveDay = dt.startOf('day');
    const diffDays = today.diff(archiveDay, 'days').days;

    let dateLabel: string;
    if (diffDays < 1) {
      dateLabel = 'Today';
    } else if (diffDays < 2) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = dt.toFormat('cccc, MMMM d, yyyy');
    }

    return { dateLabel, items };
  });
}

function formatArchiveTime(timestamp: number): string {
  return DateTime.fromMillis(timestamp).toFormat('h:mm a');
}

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
  const archivedScratchpads = useSessionQuery(
    api.scratchpad.listArchivedScratchpads,
    isHistoryOpen ? {} : 'skip'
  );

  // ── Scratchpad data ──────────────────────────────────────────────────────
  const scratchpad = useSessionQuery(api.scratchpad.getScratchpad, {});
  const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
  const archiveScratchpad = useSessionMutation(api.scratchpad.archiveScratchpad);

  // localContent: null = no pending local edits, falls back to server value.
  // Once the user types, localContent holds their edits until save completes.
  const [localContent, setLocalContent] = useState<string | null>(null);

  // Timestamp of our last successful save — used to reject stale server echoes
  const lastSavedAtRef = useRef<number>(0);
  // Whether a save is currently in-flight
  const isSavingRef = useRef(false);
  // Ref for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accept server content when: no local edits pending, no save in-flight,
  // and the server's updatedAt is newer than our last save (not just our own echo).
  const serverContent = scratchpad?.content ?? '';
  const serverUpdatedAt = scratchpad?.updatedAt ?? 0;

  const hasPendingLocalEdits = localContent !== null;
  const isServerNewer = serverUpdatedAt > lastSavedAtRef.current;

  // When a newer server update arrives and we have no pending edits, accept it
  useEffect(() => {
    if (!hasPendingLocalEdits && !isSavingRef.current && isServerNewer) {
      lastSavedAtRef.current = serverUpdatedAt;
    }
  }, [hasPendingLocalEdits, isServerNewer, serverUpdatedAt]);

  const content = hasPendingLocalEdits ? localContent : serverContent;
  const isContentInitialized = scratchpad !== undefined;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Save function — resets localContent to null on success so the subscription takes over
  const save = useCallback(
    async (contentToSave: string) => {
      setSaveStatus('saving');
      isSavingRef.current = true;
      try {
        await upsertScratchpad({ content: contentToSave });
        lastSavedAtRef.current = Date.now();
        isSavingRef.current = false;
        // Release local override — let the Convex subscription take over
        setLocalContent(null);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        isSavingRef.current = false;
        console.error('Failed to save scratchpad:', error);
        setSaveStatus('error');
      }
    },
    [upsertScratchpad]
  );

  // Debounced save on content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        save(newContent);
      }, 500);
    },
    [save]
  );

  // "New" — archive current content and clear editor
  const handleNew = useCallback(async () => {
    if (content && !isHTMLEmpty(content)) {
      const confirmed = window.confirm('Archive current content and start fresh?');
      if (!confirmed) return;
    }

    // Cancel any pending debounced save to prevent it from re-saving old content
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    try {
      await archiveScratchpad({});
      // Reset local state — the archive mutation clears server content,
      // and the Convex subscription will deliver the empty state
      setLocalContent(null);
      lastSavedAtRef.current = Date.now();
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to archive scratchpad:', error);
    }
  }, [content, archiveScratchpad]);

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
                onClick={handleNew}
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
                value={content}
                onChange={handleContentChange}
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

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[672px] h-[600px] max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-wider">
              Scratchpad History
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {archivedScratchpads === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : archivedScratchpads.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No archived scratchpads yet.
              </div>
            ) : (
              <div className="space-y-6 pr-4">
                {groupArchivesByDay(archivedScratchpads).map(({ dateLabel, items }) => (
                  <div key={dateLabel}>
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2 pt-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {dateLabel}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item._id} className="border border-border rounded-md p-3">
                          <div className="text-[10px] text-muted-foreground mb-2">
                            {formatArchiveTime(item.archivedAt)}
                          </div>
                          <SafeHTML html={item.content ?? ''} className="text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
