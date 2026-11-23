/**
 * @file GoalLogSection: the Log section of the single-scroll goal details body.
 * Shows the most recent log entries with an in-place add control, a Show all toggle,
 * and the carry-over Full history view. Replaces the former tabbed log layout.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { AlertCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { DateTime } from 'luxon';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
import { GoalLogList } from './GoalLogList';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoalLogs, useGoalLogsByRootGoal } from '@/hooks/useGoalLogs';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/** Number of most recent entries shown before "Show all". */
const RECENT_LOG_LIMIT = 5;

/** Props for GoalLogSection. */
export interface GoalLogSectionProps {
  /** The goal whose log is shown. */
  goalId: Id<'goals'>;
  /** Reports true while the create or edit form is open, false when none is open and on unmount. Blocks dialog Escape. */
  onFormActiveChange?: (isActive: boolean) => void;
  /** Additional CSS classes for the section root. */
  className?: string;
}

const NO_LOGS: GoalLog[] = [];

/** Local day key (YYYY-MM-DD) that GoalLogList groups an entry under. */
function dayKeyOf(logDate: number): string {
  return DateTime.fromMillis(logDate).toISODate() ?? 'unknown';
}

/**
 * Whether a new entry's day sorts below the 5th-largest display day key, i.e. the cap would
 * hide it. Callers only ask when the list is capped.
 */
function isBelowFifthDisplayDay(entries: GoalLog[], logDate: number): boolean {
  const fifthDayKey =
    entries
      .map((log) => dayKeyOf(log.logDate))
      .sort()
      .reverse()[RECENT_LOG_LIMIT - 1] ?? '';
  return dayKeyOf(logDate) < fifthDayKey;
}

/**
 * Whether creating an entry should expand the capped list so the new entry is visible.
 * Full history and an already-expanded list never expand, and a list below the cap shows
 * every entry already.
 */
function shouldExpandAfterCreate(
  entries: GoalLog[],
  logDate: number,
  showFullHistory: boolean,
  showAll: boolean
): boolean {
  if (showFullHistory || showAll) return false;
  if (entries.length < RECENT_LOG_LIMIT) return false;
  return isBelowFifthDisplayDay(entries, logDate);
}

/** Props for GoalLogHeading. */
interface GoalLogHeadingProps {
  /** Ref to the heading, so Show fewer can scroll it back into view. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Number of entries currently displayed. */
  count: number;
  /** Hides the count until the log has loaded. */
  isLoadingLogs: boolean;
  /** Whether the goal has logs from earlier instances, enabling the Full history toggle. */
  hasCarryOverHistory: boolean;
  /** Whether the Full history view is active. */
  showFullHistory: boolean;
  /** Switches between the current-instance and all-instances views. */
  onToggleFullHistory: () => void;
}

/** Heading chip with the entry count and the Full history toggle. Presentational only. */
function GoalLogHeading({
  headingRef,
  count,
  isLoadingLogs,
  hasCarryOverHistory,
  showFullHistory,
  onToggleFullHistory,
}: GoalLogHeadingProps) {
  // Heading row: heading chip (flex-1, truncates) and Full history toggle (shrink-0).
  return (
    <div className="flex items-center gap-2">
      <h4
        ref={headingRef}
        className="min-w-0 flex-1 rounded-md bg-muted px-4 py-1.5 text-sm font-semibold text-foreground"
      >
        Log{' '}
        {!isLoadingLogs && (
          <span className="text-xs font-normal text-muted-foreground">({count})</span>
        )}
      </h4>
      {hasCarryOverHistory && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2 text-xs"
          onClick={onToggleFullHistory}
        >
          <History className="h-3.5 w-3.5" />
          {showFullHistory ? 'Current only' : 'Full history'}
        </Button>
      )}
    </div>
  );
}

/** Props for ListErrorBanner. */
interface ListErrorBannerProps {
  /** The underlying save error message. */
  message: string;
  /** Clears the banner. */
  onDismiss: () => void;
}

/** Dismissible alert for a failed checkbox save. Presentational only. */
function ListErrorBanner({ message, onDismiss }: ListErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mx-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{`Couldn't save that change. ${message}`}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </div>
  );
}

/** Props for ShowAllFooter. */
interface ShowAllFooterProps {
  /** Total number of entries in the current view. */
  count: number;
  /** Whether every entry is shown. */
  showAll: boolean;
  /** Expands or collapses the capped list. */
  onToggle: () => void;
}

/** Footer with the Showing text and the Show all / Show fewer button. Presentational only. */
function ShowAllFooter({ count, showAll, onToggle }: ShowAllFooterProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-2">
      <p className="text-xs text-muted-foreground">
        {showAll
          ? `Showing all ${count} entries`
          : `Showing ${RECENT_LOG_LIMIT} of ${count} entries`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 gap-1.5 px-2 text-xs"
        onClick={onToggle}
        aria-expanded={showAll}
      >
        {showAll ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Show fewer
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            {`Show all (${count})`}
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * The Log section: heading with count, Full history toggle, add control, optional
 * checkbox error banner, list area (skeleton while loading), and Show all / Show fewer footer.
 */
// Complexity is intentional: one fixed single-scroll layout whose branches are presentational states the design pins.
// fallow-ignore-next-line complexity
export function GoalLogSection({ goalId, onFormActiveChange, className }: GoalLogSectionProps) {
  const { sessionId } = useSession();
  const {
    logs,
    rootGoalId,
    hasCarryOverHistory,
    isLoading,
    isCreating,
    isUpdating,
    createLog,
    updateLog,
    deleteLog,
  } = useGoalLogs(sessionId, goalId);

  const [editingLog, setEditingLog] = useState<GoalLog | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);
  // Set when the create form collapses; the effect below returns focus to the add trigger.
  const returnFocusToTriggerRef = useRef(false);
  // Set when Show fewer is clicked; the effect below brings the heading back into view.
  const scrollHeadingOnCollapseRef = useRef(false);

  // Escape stays blocked while either form is open.
  const isFormActive = editingLog !== null || isCreateFormExpanded;
  useEffect(() => {
    onFormActiveChange?.(isFormActive);
  }, [isFormActive, onFormActiveChange]);

  // The dialog closed or the section unmounted: never leave Escape blocked.
  useEffect(() => {
    return () => {
      onFormActiveChange?.(false);
    };
  }, [onFormActiveChange]);

  const { logs: fullHistoryLogs, isLoading: isLoadingFullHistory } = useGoalLogsByRootGoal(
    sessionId,
    showFullHistory ? (rootGoalId ?? null) : null
  );

  const displayedLogs = showFullHistory ? fullHistoryLogs : logs;
  const isLoadingLogs = showFullHistory ? isLoadingFullHistory : isLoading;
  const entries = displayedLogs ?? NO_LOGS;
  const count = entries.length;
  const maxEntries = showFullHistory || showAll ? undefined : RECENT_LOG_LIMIT;
  const canCollapse = !showFullHistory && count > RECENT_LOG_LIMIT;

  /**
   * Creates an entry, then expands the capped list when the new entry would be hidden.
   * GoalLogList orders by day descending first, so the 5th visible entry's day is the
   * 5th-largest day key among all entries (see `shouldExpandAfterCreate`).
   */
  const handleCreateLog = useCallback(
    async (logDate: number, content: string) => {
      await createLog(logDate, content);
      if (shouldExpandAfterCreate(entries, logDate, showFullHistory, showAll)) setShowAll(true);
    },
    [createLog, entries, showAll, showFullHistory]
  );

  /** Saves a checkbox toggle. Failures show the dismissible banner; success clears it. */
  const handleContentChange = useCallback(
    async (logId: Id<'goalLogs'>, newContent: string) => {
      try {
        await updateLog(logId, { content: newContent });
        setListError(null);
      } catch (err: unknown) {
        setListError(err instanceof Error ? err.message : 'Failed to save your change');
      }
    },
    [updateLog]
  );

  /** Saves an edited entry. Errors propagate to GoalLogEditForm, which shows them. */
  const handleSaveEdit = useCallback(
    async (logDate: number, content: string) => {
      if (!editingLog) return;
      await updateLog(editingLog._id, { logDate, content });
      setEditingLog(null);
    },
    [editingLog, updateLog]
  );

  /** Deletes an entry. Errors propagate to the confirm dialog in GoalLogEntry. */
  const handleDelete = useCallback(
    async (logId: Id<'goalLogs'>) => {
      await deleteLog(logId);
    },
    [deleteLog]
  );

  const handleToggleFullHistory = useCallback(() => {
    // Switching views discards an open edit: its entry may not exist in the other view.
    setEditingLog(null);
    setShowFullHistory((value) => !value);
  }, []);

  const handleToggleShowAll = useCallback(() => {
    scrollHeadingOnCollapseRef.current = showAll;
    setShowAll(!showAll);
  }, [showAll]);

  const handleCreateExpandedChange = useCallback((expanded: boolean) => {
    returnFocusToTriggerRef.current = !expanded;
    setIsCreateFormExpanded(expanded);
  }, []);

  // On expand: bring the form into view. On collapse: return focus to the add trigger.
  // Runs on mount with isCreateFormExpanded=false and no pending focus return, so it does nothing.
  useEffect(() => {
    if (isCreateFormExpanded) {
      formWrapperRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (returnFocusToTriggerRef.current) {
      returnFocusToTriggerRef.current = false;
      addTriggerRef.current?.focus();
    }
  }, [isCreateFormExpanded]);

  // After Show fewer: keep the heading in view, since the content above the viewport is now shorter.
  useEffect(() => {
    if (!showAll && scrollHeadingOnCollapseRef.current) {
      scrollHeadingOnCollapseRef.current = false;
      headingRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [showAll]);

  return (
    <section
      data-slot="goal-log-section"
      className={cn('flex min-w-0 flex-col gap-3 pt-1', className)}
    >
      <GoalLogHeading
        headingRef={headingRef}
        count={count}
        isLoadingLogs={isLoadingLogs}
        hasCarryOverHistory={hasCarryOverHistory}
        showFullHistory={showFullHistory}
        onToggleFullHistory={handleToggleFullHistory}
      />
      {hasCarryOverHistory && (
        <p className="px-4 text-xs text-muted-foreground">
          {showFullHistory
            ? 'Viewing logs from all instances of this goal'
            : 'Viewing logs for current instance only'}
        </p>
      )}

      {/* Add control: directly below the heading, above the entries */}
      <div ref={formWrapperRef} className="px-2">
        <GoalLogCreateForm
          onSubmit={handleCreateLog}
          isSubmitting={isCreating}
          onExpandedChange={handleCreateExpandedChange}
          disabled={showFullHistory || editingLog !== null}
          disabledLabel={showFullHistory ? undefined : 'Finish editing to add entries'}
          triggerRef={addTriggerRef}
          className={isCreateFormExpanded ? 'rounded-md border bg-muted p-4' : 'border-t-0 pt-0'}
        />
      </div>

      {listError && <ListErrorBanner message={listError} onDismiss={() => setListError(null)} />}

      {/* List area only: the skeleton replaces the list, not the heading or add control */}
      {isLoadingLogs ? (
        <div className="space-y-3 px-2" data-testid="goal-log-loading" aria-busy="true">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-1.5 pl-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-5/6" />
          </div>
        </div>
      ) : (
        <div className="px-2">
          <GoalLogList
            logs={entries}
            className={count === 0 ? 'py-4' : undefined}
            maxEntries={maxEntries}
            editingLogId={editingLog?._id ?? null}
            renderEditForm={(log) => (
              <GoalLogEditForm
                log={log}
                onSave={handleSaveEdit}
                onCancel={() => setEditingLog(null)}
                isSubmitting={isUpdating}
              />
            )}
            onContentChange={handleContentChange}
            onEdit={setEditingLog}
            onDelete={handleDelete}
          />
        </div>
      )}

      {!isLoadingLogs && canCollapse && (
        <ShowAllFooter count={count} showAll={showAll} onToggle={handleToggleShowAll} />
      )}
    </section>
  );
}
