/**
 * @file GoalLogSection: the Log section of the single-scroll goal details body.
 * Shows the most recent log entries with an in-place add control, a Show all toggle,
 * and the carry-over Full history view. Replaces the former tabbed log layout.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { AlertCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
import { GoalLogList } from './GoalLogList';
import { isHiddenByCap, type OrderableLogEntry } from './goalLogOrdering';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoalLogs, useGoalLogsByRootGoal } from '@/hooks/useGoalLogs';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/** Number of most recent entries shown before "Show all". */
const RECENT_LOG_LIMIT = 5;

/** Reason shown while an edit is open. Tooltip of every control it blocks. */
const OPEN_EDIT_REASON = 'Save or cancel the open edit first';

/** Reason shown on Edit while the add form is open. */
const OPEN_CREATE_REASON = 'Save or cancel the new entry first';

/** Banner text when a live update deletes the entry being edited. */
const DELETED_EDIT_MESSAGE = 'This entry was deleted, so your edit was discarded.';

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

/** Id of an entry that is not saved yet. It never matches a stored entry. */
const UNSAVED_ENTRY_ID = 'unsaved';

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
  /** Why the Full history toggle is unavailable. Undefined when it is available. */
  toggleDisabledReason?: string;
}

/** Heading chip with the entry count and the Full history toggle. Presentational only. */
// The disabled branch is the pinned design: one toggle, three states (available, locked, hidden).
// fallow-ignore-next-line complexity
function GoalLogHeading({
  headingRef,
  count,
  isLoadingLogs,
  hasCarryOverHistory,
  showFullHistory,
  onToggleFullHistory,
  toggleDisabledReason,
}: GoalLogHeadingProps) {
  const toggleDisabled = toggleDisabledReason !== undefined;
  // Heading row: heading chip (flex-1, truncates) and Full history toggle (shrink-0).
  return (
    <div className="flex items-center gap-2">
      <h4
        ref={headingRef}
        tabIndex={-1}
        className="min-w-0 flex-1 rounded-md bg-muted px-4 py-1.5 text-sm font-semibold text-foreground outline-none"
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
          className={cn(
            'h-7 shrink-0 gap-1.5 px-2 text-xs',
            toggleDisabled && 'text-muted-foreground/50 cursor-not-allowed'
          )}
          onClick={onToggleFullHistory}
          disabled={toggleDisabled}
          title={toggleDisabledReason}
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
  /** Full banner text. */
  message: string;
  /** Clears the banner. */
  onDismiss: () => void;
}

/** Dismissible alert for a list-level failure. Presentational only. */
function ListErrorBanner({ message, onDismiss }: ListErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mx-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{message}</p>
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
  expanded: boolean;
  /** Expands or collapses the capped list. */
  onToggle: () => void;
  /** Why Show fewer is unavailable. Undefined when it is available. */
  collapseDisabledReason?: string;
}

/** Footer with the Showing text and the Show all / Show fewer button. Presentational only. */
// The disabled collapse branch is the pinned design: one button, two labels, one locked state.
// fallow-ignore-next-line complexity
function ShowAllFooter({ count, expanded, onToggle, collapseDisabledReason }: ShowAllFooterProps) {
  const collapseDisabled = expanded && collapseDisabledReason !== undefined;
  return (
    <div className="flex items-center justify-between gap-2 px-2">
      <p className="text-xs text-muted-foreground">
        {expanded
          ? `Showing all ${count} entries`
          : `Showing ${RECENT_LOG_LIMIT} of ${count} entries`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 shrink-0 gap-1.5 px-2 text-xs',
          collapseDisabled && 'text-muted-foreground/50 cursor-not-allowed'
        )}
        onClick={onToggle}
        disabled={collapseDisabled}
        title={collapseDisabled ? collapseDisabledReason : undefined}
        aria-expanded={expanded}
      >
        {expanded ? (
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
 * Returns focus after the add form collapses: to the trigger, or to the Log heading
 * when the trigger is disabled (a disabled control cannot take focus).
 */
function focusAfterCreateCollapse(
  trigger: HTMLButtonElement | null,
  heading: HTMLHeadingElement | null
): void {
  (trigger && !trigger.disabled ? trigger : heading)?.focus();
}

/**
 * The Log section: heading with count, Full history toggle, add control, optional
 * error banner, list area (skeleton while loading), and Show all / Show fewer footer.
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
  // Set when an edit closes; the effect below returns focus to the add trigger.
  const returnFocusAfterEditRef = useRef(false);
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
  const canCollapse = !showFullHistory && count > RECENT_LOG_LIMIT;

  // The open edit's entry as the data now has it. Undefined when a live update removed it.
  const liveEditedLog = editingLog
    ? entries.find((entry) => entry._id === editingLog._id)
    : undefined;
  // Collapsing would hide the open edit's entry. The list stays expanded and Show fewer is disabled.
  const editHoldsListOpen =
    !showFullHistory &&
    liveEditedLog !== undefined &&
    isHiddenByCap(entries, liveEditedLog, RECENT_LOG_LIMIT);
  const isExpanded = showFullHistory || showAll || editHoldsListOpen;
  const maxEntries = isExpanded ? undefined : RECENT_LOG_LIMIT;
  // The open edit's entry was deleted by a live update. Checked only once the list has loaded.
  const editedEntryMissing = editingLog !== null && !isLoadingLogs && liveEditedLog === undefined;

  // One edit at a time, and no edit while the add draft is open, so its draft is never discarded.
  const editDisabledReason =
    editingLog !== null ? OPEN_EDIT_REASON : isCreateFormExpanded ? OPEN_CREATE_REASON : undefined;
  // Switching views would drop the open edit, so the toggle waits for it.
  const fullHistoryToggleDisabledReason = editingLog !== null ? OPEN_EDIT_REASON : undefined;

  /**
   * Whether saving this entry would hide it under the cap, so the list must expand to show it.
   * Full history and an already-expanded list never need to expand.
   */
  const wouldLeaveCappedView = useCallback(
    (candidate: OrderableLogEntry) =>
      !showFullHistory && !showAll && isHiddenByCap(entries, candidate, RECENT_LOG_LIMIT),
    [entries, showAll, showFullHistory]
  );

  /**
   * Creates an entry, then expands the capped list when the new entry would be hidden.
   * A new entry is the newest, so it wins ties on its day.
   */
  const handleCreateLog = useCallback(
    async (logDate: number, content: string) => {
      await createLog(logDate, content);
      const created = { _id: UNSAVED_ENTRY_ID, logDate, createdAt: Number.MAX_SAFE_INTEGER };
      if (wouldLeaveCappedView(created)) setShowAll(true);
    },
    [createLog, wouldLeaveCappedView]
  );

  /** Saves a checkbox toggle. Failures show the dismissible banner; success clears it. */
  const handleContentChange = useCallback(
    async (logId: Id<'goalLogs'>, newContent: string) => {
      try {
        await updateLog(logId, { content: newContent });
        setListError(null);
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : 'Failed to save your change';
        setListError(`Couldn't save that change. ${reason}`);
      }
    },
    [updateLog]
  );

  /** Closes the edit form. Focus returns to the add trigger once it is enabled again. */
  const closeEdit = useCallback(() => {
    returnFocusAfterEditRef.current = true;
    setEditingLog(null);
  }, []);

  /** Opens the edit form for an entry. Refused while another edit or the add form is open. */
  const handleStartEdit = useCallback(
    (log: GoalLog) => {
      if (editDisabledReason !== undefined) return;
      setEditingLog(log);
    },
    [editDisabledReason]
  );

  /**
   * Saves an edited entry, then expands the capped list when the saved entry would be hidden,
   * so an edit that moves an entry older never makes it vanish. Errors propagate to GoalLogEditForm.
   */
  const handleSaveEdit = useCallback(
    async (logDate: number, content: string) => {
      if (!editingLog) return;
      await updateLog(editingLog._id, { logDate, content });
      if (wouldLeaveCappedView({ ...editingLog, logDate })) setShowAll(true);
      closeEdit();
    },
    [editingLog, updateLog, wouldLeaveCappedView, closeEdit]
  );

  /** Deletes an entry. Errors propagate to the confirm dialog in GoalLogEntry. */
  const handleDelete = useCallback(
    async (logId: Id<'goalLogs'>) => {
      await deleteLog(logId);
    },
    [deleteLog]
  );

  const handleCreateExpandedChange = useCallback((expanded: boolean) => {
    returnFocusToTriggerRef.current = !expanded;
    setIsCreateFormExpanded(expanded);
  }, []);

  const handleToggleFullHistory = useCallback(() => {
    // Turning Full history on collapses an open add form. Its draft stays in GoalLogCreateForm.
    if (!showFullHistory && isCreateFormExpanded) handleCreateExpandedChange(false);
    setShowFullHistory(!showFullHistory);
  }, [showFullHistory, isCreateFormExpanded, handleCreateExpandedChange]);

  const handleToggleShowAll = useCallback(() => {
    scrollHeadingOnCollapseRef.current = showAll;
    setShowAll(!showAll);
  }, [showAll]);

  // On expand: bring the form into view.
  useEffect(() => {
    if (isCreateFormExpanded && formWrapperRef.current) {
      formWrapperRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isCreateFormExpanded]);

  // On collapse: return focus to the add trigger. Runs on mount with no pending focus return.
  useEffect(() => {
    if (isCreateFormExpanded || !returnFocusToTriggerRef.current) return;
    returnFocusToTriggerRef.current = false;
    focusAfterCreateCollapse(addTriggerRef.current, headingRef.current);
  }, [isCreateFormExpanded]);

  // After an edit closes, the add trigger is enabled again: return focus to it.
  useEffect(() => {
    if (editingLog === null && returnFocusAfterEditRef.current) {
      returnFocusAfterEditRef.current = false;
      addTriggerRef.current?.focus();
    }
  }, [editingLog]);

  // A live update deleted the entry being edited. It cannot be saved, so close the edit and say why.
  useEffect(() => {
    if (!editedEntryMissing) return;
    // eslint-disable-next-line -- A live deletion is only observable after a render, and the banner must be raised once.
    setListError(DELETED_EDIT_MESSAGE);
    closeEdit();
  }, [editedEntryMissing, closeEdit]);

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
        toggleDisabledReason={fullHistoryToggleDisabledReason}
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
          expanded={isCreateFormExpanded}
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
            editDisabledReason={editDisabledReason}
            renderEditForm={(log) => (
              <GoalLogEditForm
                log={log}
                onSave={handleSaveEdit}
                onCancel={closeEdit}
                isSubmitting={isUpdating}
              />
            )}
            onContentChange={handleContentChange}
            onEdit={handleStartEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {!isLoadingLogs && canCollapse && (
        <ShowAllFooter
          count={count}
          expanded={isExpanded}
          onToggle={handleToggleShowAll}
          collapseDisabledReason={editHoldsListOpen ? OPEN_EDIT_REASON : undefined}
        />
      )}
    </section>
  );
}
