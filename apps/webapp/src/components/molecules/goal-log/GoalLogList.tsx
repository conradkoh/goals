/**
 * @file GoalLogList component for displaying grouped log entries.
 * Groups logs by day and renders them with date headers.
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { CalendarIcon } from 'lucide-react';
import { DateTime } from 'luxon';
import { useMemo } from 'react';

import { GoalLogEntry } from './GoalLogEntry';

import { cn } from '@/lib/utils';

/**
 * Props for the GoalLogList component.
 */
export interface GoalLogListProps {
  /** Array of log entries to display */
  logs: GoalLog[];
  /** Callback when log content is updated (for interactive checkboxes) */
  onContentChange?: (logId: Id<'goalLogs'>, newContent: string) => void;
  /** Callback when edit is requested */
  onEdit?: (log: GoalLog) => void;
  /** Callback when delete is requested */
  onDelete?: (logId: Id<'goalLogs'>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Groups log entries by their log date (day).
 * Returns an array of groups sorted by date descending (most recent first).
 */
function groupLogsByDay(logs: GoalLog[]): { date: string; dateLabel: string; logs: GoalLog[] }[] {
  const groupMap = new Map<string, GoalLog[]>();

  for (const log of logs) {
    const dateKey = DateTime.fromMillis(log.logDate).toISODate() ?? 'unknown';
    const existing = groupMap.get(dateKey) ?? [];
    existing.push(log);
    groupMap.set(dateKey, existing);
  }

  // Convert to array and sort by date descending
  const groups = Array.from(groupMap.entries())
    .map(([date, logs]) => {
      const dt = DateTime.fromISO(date);
      const today = DateTime.now().startOf('day');
      const yesterday = today.minus({ days: 1 });

      let dateLabel: string;
      if (dt.hasSame(today, 'day')) {
        dateLabel = 'Today';
      } else if (dt.hasSame(yesterday, 'day')) {
        dateLabel = 'Yesterday';
      } else if (dt.hasSame(today, 'week')) {
        dateLabel = dt.toFormat('EEEE'); // Day name for this week
      } else if (dt.hasSame(today, 'year')) {
        dateLabel = dt.toFormat('EEEE, MMMM d'); // Day, Month Day
      } else {
        dateLabel = dt.toFormat('EEEE, MMMM d, yyyy'); // Full date
      }

      return {
        date,
        dateLabel,
        logs: logs.sort((a, b) => b.createdAt - a.createdAt), // Sort logs within group by creation time
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort groups by date descending

  return groups;
}

/**
 * Displays a list of goal log entries grouped by day.
 * Shows date headers for each group and renders entries with interactive content.
 *
 * @example
 * ```tsx
 * <GoalLogList
 *   logs={goalLogs}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function GoalLogList({
  logs,
  onContentChange,
  onEdit,
  onDelete,
  className,
}: GoalLogListProps) {
  const groupedLogs = useMemo(() => groupLogsByDay(logs), [logs]);

  if (logs.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No log entries yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Add your first log entry to track progress on this goal
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {groupedLogs.map((group) => (
        <div key={group.date} className="space-y-3">
          {/* Day header */}
          <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 -mx-1 px-1 z-10">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">{group.dateLabel}</h4>
            <span className="text-xs text-muted-foreground">
              ({group.logs.length} {group.logs.length === 1 ? 'entry' : 'entries'})
            </span>
          </div>

          {/* Log entries for this day */}
          <div className="space-y-2 pl-6">
            {group.logs.map((log) => (
              <GoalLogEntry
                key={log._id}
                log={log}
                showDate={false}
                onContentChange={onContentChange}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
