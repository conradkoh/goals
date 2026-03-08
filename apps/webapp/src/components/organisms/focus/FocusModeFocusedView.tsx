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
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Check, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AdhocGoalItem } from '@/components/molecules/goal-list-item';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { DayOfWeek } from '@/lib/constants';

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
  const dayOfWeek = currentDate.weekday as DayOfWeek; // 1 = Monday … 7 = Sunday

  const formattedDate = currentDate.toFormat('cccc, MMMM d'); // e.g. "Monday, March 2"

  // ── Today's adhoc goals ──────────────────────────────────────────────────
  const adhocGoals = useSessionQuery(api.adhocGoal.getAdhocGoalsForDay, {
    year,
    weekNumber,
    dayOfWeek,
  });

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
              {/* Save status indicator */}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    Saved ✓
                  </>
                )}
                {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNew}
                className="text-xs uppercase tracking-wider font-bold"
              >
                New
              </Button>
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
                  <AdhocGoalItem goal={goal} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
