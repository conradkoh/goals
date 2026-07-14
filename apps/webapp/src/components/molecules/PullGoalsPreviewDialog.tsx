import { History, Loader2, Pin, Search, Star } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Shared types ────────────────────────────────────────────────────────────

/** A week reference within a specific year/quarter. */
export type WeekRef = {
  year: number;
  quarter: number;
  weekNumber: number;
};

/** A task item rendered in the preview list. */
export interface PreviewTask {
  id: string;
  title: string;
  details?: string;
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoal: {
    id: string;
    title: string;
  };
  children?: PreviewTask[];
  depth?: number;
}

/** A week option returned by `api.goal.getAvailableWeeks`. */
interface WeekOption {
  year: number;
  quarter: number;
  weekNumber: number;
  label: string;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface PullGoalsPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromWeek: WeekRef | null;
  toWeek: WeekRef;
  tasksFromPreviousWeek: PreviewTask[];
  tasksFromPastDays: PreviewTask[];
  /** True when To is calendar current week and past-days pull applies. */
  showPastDaysSection: boolean;
  /** Display name for today (e.g. "Wednesday") when past-days section shown. */
  todayLabel: string;
  isRefreshingPreview: boolean;
  isPulling: boolean;
  /** Week options for the current To quarter. */
  weekOptions: WeekOption[];
  onFromWeekChange: (week: WeekRef) => void;
  onToWeekChange: (week: WeekRef) => void;
  onJumpToLastNonEmpty: () => void;
  onConfirm: () => void;
}

// ── Local helpers ────────────────────────────────────────────────────────────

/** Recursive task item renderer. */
function TaskPreviewItem({ task, depth = 0 }: { task: PreviewTask; depth?: number }) {
  return (
    <>
      <li className="flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
        <div className="text-sm break-words">{task.title}</div>
      </li>
      {task.children &&
        task.children.length > 0 &&
        task.children.map((child) => (
          <TaskPreviewItem key={child.id} task={child} depth={depth + 1} />
        ))}
    </>
  );
}

/** Group tasks by quarterly → weekly, same structure as TaskMovePreview. */
interface QuarterlyGroup {
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoals: Record<
    string,
    {
      weeklyGoal: { id: string; title: string };
      tasks: PreviewTask[];
    }
  >;
}

function groupTasks(tasks: PreviewTask[]): Record<string, QuarterlyGroup> {
  return tasks.reduce(
    (acc, task) => {
      const quarterlyId = task.quarterlyGoal.id;
      const weeklyId = task.weeklyGoal.id;

      if (!acc[quarterlyId]) {
        acc[quarterlyId] = {
          quarterlyGoal: task.quarterlyGoal,
          weeklyGoals: {},
        };
      }
      if (!acc[quarterlyId].weeklyGoals[weeklyId]) {
        acc[quarterlyId].weeklyGoals[weeklyId] = {
          weeklyGoal: task.weeklyGoal,
          tasks: [],
        };
      }
      acc[quarterlyId].weeklyGoals[weeklyId].tasks.push(task);
      return acc;
    },
    {} as Record<string, QuarterlyGroup>
  );
}

/** Render a grouped task list. */
function TaskGroupList({ tasks }: { tasks: PreviewTask[] }) {
  const grouped = groupTasks(tasks);

  return (
    <div className="space-y-4">
      {Object.values(grouped).map((quarterlyGroup) => (
        <div key={quarterlyGroup.quarterlyGoal.id} className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium">
            {quarterlyGroup.quarterlyGoal.isStarred && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            )}
            {quarterlyGroup.quarterlyGoal.isPinned && (
              <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
            )}
            <div className="rounded-md px-2 py-1 text-sm font-semibold text-foreground break-words">
              {quarterlyGroup.quarterlyGoal.title}
            </div>
          </h4>
          <div
            className={cn(
              'overflow-hidden rounded-md',
              quarterlyGroup.quarterlyGoal.isStarred
                ? 'border border-yellow-200 bg-yellow-50'
                : quarterlyGroup.quarterlyGoal.isPinned
                  ? 'border border-blue-200 bg-blue-50'
                  : ''
            )}
          >
            {Object.values(quarterlyGroup.weeklyGoals).map((weeklyGroup) => (
              <div key={weeklyGroup.weeklyGoal.id} className="space-y-1 py-2 pl-4">
                <h5 className="text-sm text-muted-foreground">
                  <div className="rounded-md px-2 py-1 text-sm font-semibold text-foreground break-words">
                    {weeklyGroup.weeklyGoal.title}
                  </div>
                </h5>
                <ul className="space-y-1">
                  {weeklyGroup.tasks.map((task) => (
                    <TaskPreviewItem key={task.id} task={task} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PullGoalsPreviewDialog(props: PullGoalsPreviewDialogProps) {
  const {
    open,
    onOpenChange,
    fromWeek,
    toWeek,
    tasksFromPreviousWeek,
    tasksFromPastDays,
    showPastDaysSection,
    todayLabel,
    isRefreshingPreview,
    isPulling,
    weekOptions,
    onFromWeekChange,
    onToWeekChange,
    onJumpToLastNonEmpty,
    onConfirm,
  } = props;

  const totalTasks = tasksFromPreviousWeek.length + tasksFromPastDays.length;

  // ── Week option filtering ─────────────────────────────────────────────────
  // From options: all weeks strictly before the selected To week.
  // If fromWeek is set but no option has that weekNumber, append a synthetic
  // option so the Select control never goes blank (e.g. Jump returns a week
  // outside the quarter's week list, or an old week the quarter didn't include).
  const fromOptionsBase = weekOptions.filter((w) => w.weekNumber < toWeek.weekNumber);
  const fromOptions =
    fromWeek && !fromOptionsBase.some((w) => w.weekNumber === fromWeek.weekNumber)
      ? [
          ...fromOptionsBase,
          {
            year: fromWeek.year,
            quarter: fromWeek.quarter,
            weekNumber: fromWeek.weekNumber,
            label: `Week ${fromWeek.weekNumber}`,
          },
        ].sort((a, b) => a.weekNumber - b.weekNumber)
      : fromOptionsBase;
  // To options: all available weeks in the quarter
  const toOptions = weekOptions;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFromChange = (weekNumberStr: string) => {
    const weekNumber = parseInt(weekNumberStr, 10);
    const match = weekOptions.find((w) => w.weekNumber === weekNumber);
    if (match) {
      onFromWeekChange({
        year: match.year,
        quarter: match.quarter,
        weekNumber: match.weekNumber,
      });
    }
  };

  const handleToChange = (weekNumberStr: string) => {
    const weekNumber = parseInt(weekNumberStr, 10);
    const match = weekOptions.find((w) => w.weekNumber === weekNumber);
    if (match) {
      onToWeekChange({
        year: match.year,
        quarter: match.quarter,
        weekNumber: match.weekNumber,
      });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex max-h-[90vh] flex-col">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <AlertDialogHeader className="shrink-0">
          <AlertDialogTitle>Pull Incomplete Goals</AlertDialogTitle>
          <AlertDialogDescription>
            Choose which week to pull from and to. Incomplete goals will be moved (not copied).
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <div className="shrink-0 space-y-3">
          {/* From row */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>From week</Label>
              <Select
                value={fromWeek ? String(fromWeek.weekNumber) : ''}
                onValueChange={handleFromChange}
                disabled={fromOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No prior week" />
                </SelectTrigger>
                <SelectContent>
                  {fromOptions.map((option) => (
                    <SelectItem key={option.weekNumber} value={String(option.weekNumber)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onJumpToLastNonEmpty}
              disabled={isRefreshingPreview || isPulling}
              className="shrink-0"
            >
              {isRefreshingPreview ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="mr-1 h-3.5 w-3.5" />
              )}
              Jump
            </Button>
          </div>

          {/* To row */}
          <div className="space-y-1">
            <Label>To week</Label>
            <Select value={String(toWeek.weekNumber)} onValueChange={handleToChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions.map((option) => (
                  <SelectItem key={option.weekNumber} value={String(option.weekNumber)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Preview body ────────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1 overflow-y-auto pr-2 -mr-2">
          {/* Loading overlay */}
          {isRefreshingPreview && totalTasks > 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {totalTasks === 0 && !isRefreshingPreview ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nothing to pull for this range.</p>
            </div>
          ) : (
            <div
              className={cn(
                'space-y-6',
                isRefreshingPreview && 'opacity-50 transition-opacity'
              )}
            >
              {/* Section A: Week pull */}
              {fromWeek && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Week {fromWeek.weekNumber} → Week {toWeek.weekNumber}
                  </h3>
                  {tasksFromPreviousWeek.length > 0 ? (
                    <TaskGroupList tasks={tasksFromPreviousWeek} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No incomplete goals in this week.
                    </p>
                  )}
                </section>
              )}

              {/* Section B: Past days → today */}
              {showPastDaysSection && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Past days → {todayLabel}
                  </h3>
                  {tasksFromPastDays.length > 0 ? (
                    <TaskGroupList tasks={tasksFromPastDays} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No incomplete goals from past days.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <AlertDialogFooter className="shrink-0">
          <AlertDialogCancel disabled={isPulling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={totalTasks === 0 || isPulling || isRefreshingPreview}
          >
            {isPulling ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Pulling...
              </>
            ) : (
              'Pull Goals'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
