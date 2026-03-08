'use client';

/**
 * FocusModeFocusedView organism component.
 *
 * A two-section focused view:
 * 1. Global scratchpad — rich text editor with auto-save and archive ("New") support
 * 2. Today's adhoc items — live clock-driven list of today's adhoc goals
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
    <div className="space-y-6 p-4">
      {/* ── Scratchpad section ─────────────────────────────────────────── */}
      <div className="bg-card rounded-lg shadow-sm p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-foreground">📝 Scratchpad</h2>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={handleNew}>
              New
            </Button>
          </div>
        </div>

        {/* Editor — shown once content has been initialized from backend */}
        {!isContentInitialized ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="min-h-[200px] border border-border rounded-md">
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing..."
            />
          </div>
        )}
      </div>

      {/* ── Today's adhoc items section ────────────────────────────────── */}
      <div className="bg-card rounded-lg shadow-sm p-4">
        <h2 className="font-semibold text-foreground mb-4">
          📋 Today&apos;s Tasks — {formattedDate}
        </h2>

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
  );
}
