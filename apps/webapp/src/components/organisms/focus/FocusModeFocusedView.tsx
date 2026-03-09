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
import { Loader2, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AdhocGoalItem } from '@/components/molecules/goal-list-item';
import { FocusUrgentSection } from '@/components/organisms/focus/FocusUrgentSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayOfWeek } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

// ============================================================================
// Types
// ============================================================================

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  // ── Scratchpad data ──────────────────────────────────────────────────────
  const scratchpad = useSessionQuery(api.scratchpad.getScratchpad, {});
  const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
  const archiveScratchpad = useSessionMutation(api.scratchpad.archiveScratchpad);

  // localContent: null means "not yet edited by user" — falls back to server value
  const [localContent, setLocalContent] = useState<string | null>(null);

  // Derived: use local edits if any, otherwise fall back to server value
  const content = localContent ?? scratchpad?.content ?? '';
  // Editor is only shown once the server data has loaded
  const isContentInitialized = scratchpad !== undefined;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Ref for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save function
  const save = useCallback(
    async (contentToSave: string) => {
      setSaveStatus('saving');
      try {
        await upsertScratchpad({ content: contentToSave });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
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
    if (content && content.trim().length > 0) {
      const confirmed = window.confirm('Archive current content and start fresh?');
      if (!confirmed) return;
    }

    try {
      await archiveScratchpad({});
      // Clear editor
      setLocalContent('');
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to archive scratchpad:', error);
    }
  }, [content, archiveScratchpad]);

  // Keyboard shortcut: Ctrl+N / Cmd+N → handleNew
  // Does NOT fire when focused on a native input or textarea
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        const target = event.target as HTMLElement;
        const isNativeInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (isNativeInput) return;
        event.preventDefault();
        handleNew();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNew]);

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

  // ── Today's adhoc goals ──────────────────────────────────────────────────
  // Use getAdhocGoalsForWeek (returns AdhocGoalWithChildren[] — hierarchical)
  // getAdhocGoalsForDay returns a flat list without children, so hierarchy wouldn't show
  const adhocGoals = useSessionQuery(api.adhocGoal.getAdhocGoalsForWeek, {
    year,
    weekNumber,
  });

  // ── Adhoc goal mutations ────────────────────────────────────────────────
  const createAdhocGoal = useSessionMutation(api.adhocGoal.createAdhocGoal);
  const updateAdhocGoal = useSessionMutation(api.adhocGoal.updateAdhocGoal);
  const deleteAdhocGoal = useSessionMutation(api.adhocGoal.deleteAdhocGoal);

  const handleCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      try {
        await updateAdhocGoal({ goalId, isComplete });
      } catch (error) {
        console.error('Failed to update goal completion:', error);
      }
    },
    [updateAdhocGoal]
  );

  const handleUpdate = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      try {
        await updateAdhocGoal({ goalId, title, details, dueDate, domainId });
      } catch (error) {
        console.error('Failed to update adhoc goal:', error);
      }
    },
    [updateAdhocGoal]
  );

  const handleDelete = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteAdhocGoal({ goalId });
      } catch (error) {
        console.error('Failed to delete adhoc goal:', error);
      }
    },
    [deleteAdhocGoal]
  );

  const handleCreateChild = useCallback(
    async (parentId: Id<'goals'>, title: string) => {
      try {
        await createAdhocGoal({
          title,
          year,
          weekNumber,
          parentId,
        });
      } catch (error) {
        console.error('Failed to create subtask:', error);
      }
    },
    [createAdhocGoal, year, weekNumber]
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
    <div className="flex flex-col md:flex-row gap-0 h-full">
      {/* ── Scratchpad section — 2/3 on desktop, full on mobile ─────────── */}
      <div className="flex-1 md:flex-[2] border-b md:border-b-0 md:border-r border-border flex flex-col">
        <div className="flex flex-col h-full">
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNew}
                      className="text-xs uppercase tracking-wider font-bold"
                    >
                      New
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Archive &amp; clear (⌘N / Ctrl+N)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Editor — flex-1 to fill height */}
          <div className="flex-1 min-h-[300px]">
            {!isContentInitialized ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RichTextEditor
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                className="min-h-[500px]"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Today's tasks section — 1/3 on desktop, full on mobile ─────── */}
      <div className="md:w-80 flex flex-col">
        {/* Industrial header */}
        <div className="px-4 py-3 border-b-2 border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Today&apos;s Tasks
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {/* Urgent (on-fire) goals section */}
        <FocusUrgentSection
          year={year}
          quarter={quarter}
          weekNumber={weekNumber}
          dayOfWeek={dayOfWeek}
        />

        {/* Task list */}
        <div className="px-4 py-3">
          {adhocGoals === undefined ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : adhocGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for today.</p>
          ) : (
            <ul className="space-y-1">
              {adhocGoals.map((goal) => (
                <li key={goal._id}>
                  <AdhocGoalItem
                    goal={goal}
                    onCompleteChange={handleCompleteChange}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onCreateChild={handleCreateChild}
                    showDueDate={false}
                    showDomain={false}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Inline add task */}
          <div className="flex items-center gap-2 mt-3 border-t border-border pt-3">
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
      </div>
    </div>
  );
}
