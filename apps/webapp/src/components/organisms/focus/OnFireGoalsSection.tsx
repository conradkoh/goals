import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Eye, Flame, Info, Pin, Star } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { useFireGoals } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the OnFireGoalsSection component.
 */
interface OnFireGoalsSectionProps {
  /** Array of weekly goals with their parent quarterly goals */
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  /** The currently selected day of the week */
  selectedDayOfWeek: DayOfWeek;
  /** The ISO week number being displayed */
  weekNumber: number;
  /** Whether focus mode is currently enabled */
  isFocusModeEnabled?: boolean;
}

/**
 * Internal type for domain pill color configuration.
 */
interface _DomainPillColors {
  foreground: string;
  background: string;
  border: string;
  dotColor: string;
}

/**
 * Displays goals marked as "on fire" (urgent) for the selected day.
 * Shows quarterly, weekly, daily, and adhoc goals that are marked as urgent.
 * Goals are grouped by their hierarchy and domains for better organization.
 */
export const OnFireGoalsSection: React.FC<OnFireGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  weekNumber,
  isFocusModeEnabled = false,
}) => {
  const { onUpdateGoal } = useGoalActionsContext();
  const { weeklyGoals } = useWeek();
  const { fireGoals } = useFireGoals();
  const { sessionId } = useSession();
  const { adhocGoals, updateAdhocGoal, deleteAdhocGoal } = useAdhocGoals(sessionId);

  const onFireGoalsByQuarterly = useMemo(() => {
    if (fireGoals.size === 0) return null;

    const result = new Map<
      string,
      {
        quarterlyGoal: GoalWithDetailsAndChildren;
        weeklyGoals: Array<{
          weeklyGoal: GoalWithDetailsAndChildren;
          dailyGoals: GoalWithDetailsAndChildren[];
          isWeeklyOnFire: boolean;
        }>;
      }
    >();

    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      const weeklyId = weeklyGoal._id.toString();
      const isWeeklyOnFire = fireGoals.has(weeklyId);

      const onFireDailyGoals = weeklyGoal.children.filter(
        (dailyGoal) =>
          dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
          fireGoals.has(dailyGoal._id.toString())
      );

      if (!isWeeklyOnFire && onFireDailyGoals.length === 0) return;

      if (!result.has(quarterlyId)) {
        result.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }

      let weeklyGoalEntry = result
        .get(quarterlyId)
        ?.weeklyGoals.find((entry) => entry.weeklyGoal._id === weeklyGoal._id);

      if (!weeklyGoalEntry) {
        weeklyGoalEntry = {
          weeklyGoal,
          dailyGoals: [],
          isWeeklyOnFire,
        };
        result.get(quarterlyId)?.weeklyGoals.push(weeklyGoalEntry);
      } else {
        weeklyGoalEntry.isWeeklyOnFire = weeklyGoalEntry.isWeeklyOnFire || isWeeklyOnFire;
      }

      if (onFireDailyGoals.length > 0) {
        weeklyGoalEntry.dailyGoals.push(...onFireDailyGoals);
      }
    });

    weeklyGoals
      .filter(
        (goal) =>
          fireGoals.has(goal._id.toString()) &&
          !goal.children.some((child) => child.state?.daily?.dayOfWeek === selectedDayOfWeek)
      )
      .forEach((weeklyGoal) => {
        const parentQuarterlyGoal = weeklyGoalsWithQuarterly.find(
          (item) => item.weeklyGoal._id === weeklyGoal.parentId
        )?.quarterlyGoal;

        if (parentQuarterlyGoal) {
          const quarterlyId = parentQuarterlyGoal._id.toString();

          if (!result.has(quarterlyId)) {
            result.set(quarterlyId, {
              quarterlyGoal: parentQuarterlyGoal,
              weeklyGoals: [],
            });
          }

          const existingEntry = result
            .get(quarterlyId)
            ?.weeklyGoals.find((entry) => entry.weeklyGoal._id === weeklyGoal._id);

          if (!existingEntry) {
            result.get(quarterlyId)?.weeklyGoals.push({
              weeklyGoal,
              dailyGoals: [],
              isWeeklyOnFire: true,
            });
          } else {
            existingEntry.isWeeklyOnFire = true;
          }
        }
      });

    return result.size > 0 ? result : null;
  }, [fireGoals, weeklyGoalsWithQuarterly, selectedDayOfWeek, weeklyGoals]);

  const onFireAdhocGoals = useMemo(() => {
    if (fireGoals.size === 0 || !adhocGoals) return [];

    return adhocGoals.filter((goal) => {
      if (!fireGoals.has(goal._id.toString())) return false;
      if (goal.adhoc?.weekNumber !== weekNumber) return false;
      if (goal.adhoc?.dayOfWeek && goal.adhoc.dayOfWeek !== selectedDayOfWeek) return false;
      return true;
    });
  }, [fireGoals, adhocGoals, weekNumber, selectedDayOfWeek]);

  const onFireAdhocGoalsByDomain = useMemo(() => {
    if (onFireAdhocGoals.length === 0) return [];

    const grouped = onFireAdhocGoals.reduce(
      (acc, goal) => {
        const domainId = goal.adhoc?.domainId || 'uncategorized';
        if (!acc[domainId]) {
          acc[domainId] = {
            domain: goal.domain,
            goals: [],
          };
        }
        acc[domainId].goals.push(goal);
        return acc;
      },
      {} as Record<string, { domain?: Doc<'domains'>; goals: typeof onFireAdhocGoals }>
    );

    return Object.entries(grouped).sort(([keyA, groupA], [keyB, groupB]) => {
      if (keyA === 'uncategorized') return 1;
      if (keyB === 'uncategorized') return -1;
      return (groupA.domain?.name || '').localeCompare(groupB.domain?.name || '');
    });
  }, [onFireAdhocGoals]);

  const hasAnyFireGoals = onFireGoalsByQuarterly !== null || onFireAdhocGoalsByDomain.length > 0;

  const _handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goalId, title, details, dueDate);
    },
    [onUpdateGoal]
  );

  const _handleUpdateAdhocGoal = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      await updateAdhocGoal(goalId, { title, details, dueDate, domainId });
    },
    [updateAdhocGoal]
  );

  const _handleAdhocCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      await updateAdhocGoal(goalId, { isComplete });
    },
    [updateAdhocGoal]
  );

  const _handleDeleteAdhocGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteAdhocGoal(goalId);
    },
    [deleteAdhocGoal]
  );

  if (!hasAnyFireGoals) {
    if (isFocusModeEnabled) {
      return (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">Urgent Items</h2>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-red-400 hover:text-red-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                    <p className="text-xs max-w-xs">
                      These urgent items are stored locally in your browser.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={'ghost'}
                    size="sm"
                    onClick={() => {}}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show all goals</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-red-600">No urgent items for today. Showing all goals.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-red-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Urgent Items</h2>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-red-400 hover:text-red-500 transition-colors" />
              </TooltipTrigger>
              <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                <p className="text-xs max-w-xs">
                  These urgent items are stored locally in your browser.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-4">
        {onFireGoalsByQuarterly &&
          Array.from(onFireGoalsByQuarterly.entries()).map(
            ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
              <div key={quarterlyId} className="border-b border-red-100 pb-3 last:border-b-0">
                <div className="flex items-center gap-1.5 mb-2">
                  {quarterlyGoal.state?.isStarred && (
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                  {quarterlyGoal.state?.isPinned && (
                    <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                  )}
                  <GoalProvider goal={quarterlyGoal}>
                    <GoalDetailsPopover
                      onSave={(title, details, dueDate) =>
                        _handleUpdateGoal(quarterlyGoal._id, title, details, dueDate)
                      }
                      triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-red-800 hover:text-red-900 hover:no-underline"
                      titleClassName={cn(
                        'break-words w-full whitespace-pre-wrap flex items-center',
                        quarterlyGoal.isComplete ? 'flex items-center' : '',
                        getDueDateStyle(
                          quarterlyGoal.dueDate ? new Date(quarterlyGoal.dueDate) : null,
                          quarterlyGoal.isComplete
                        )
                      )}
                    />
                  </GoalProvider>
                </div>

                <div className="space-y-2 ml-4">
                  {weeklyGoals.map(({ weeklyGoal, dailyGoals, isWeeklyOnFire }) => (
                    <div key={`weekly-${weeklyGoal._id.toString()}`}>
                      {(isWeeklyOnFire || dailyGoals.length > 0) && (
                        <div className="mb-1">
                          <GoalProvider goal={weeklyGoal}>
                            <WeeklyGoalTaskItem />
                          </GoalProvider>
                        </div>
                      )}

                      {dailyGoals.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {dailyGoals.map((dailyGoal) => (
                            <GoalProvider key={dailyGoal._id.toString()} goal={dailyGoal}>
                              <DailyGoalTaskItem />
                            </GoalProvider>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

        {onFireAdhocGoalsByDomain.length > 0 && (
          <div className="border-b border-red-100 pb-3 last:border-b-0">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="font-semibold text-red-800">Adhoc Tasks</h3>
            </div>
            <div className="space-y-3 ml-4">
              {onFireAdhocGoalsByDomain.map(([domainId, { domain, goals }]) => {
                const colors = _getDomainPillColors(domain?.color);
                return (
                  <div key={domainId} className="space-y-1">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: colors.dotColor }}
                      />
                      {domain ? domain.name : 'Uncategorized'} ({goals.length})
                    </div>
                    <div className="space-y-0.5">
                      {goals.map((goal) => (
                        <AdhocGoalItem
                          key={goal._id}
                          goal={goal}
                          onCompleteChange={_handleAdhocCompleteChange}
                          onUpdate={_handleUpdateAdhocGoal}
                          onDelete={_handleDeleteAdhocGoal}
                          showDueDate={false}
                          showDomain={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Converts hex color string to RGB values.
 * @param hex - Hex color string (with or without # prefix)
 * @returns RGB values or null if invalid format
 */
function _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates the relative luminance of an RGB color.
 * Uses the WCAG formula for determining perceived brightness.
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance value (0-1)
 */
function _getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Darkens an RGB color by reducing component values.
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param factor - Multiplier for darkening (default 0.6 = 60% darker)
 * @returns RGB color string
 */
function _darkenColor(r: number, g: number, b: number, factor = 0.6): string {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Generates color variations for domain pill styling.
 * Creates accessible foreground/background combinations based on the base color's luminance.
 * @param domainColor - Hex color string for the domain
 * @returns Color configuration for pill styling
 */
function _getDomainPillColors(domainColor?: string): _DomainPillColors {
  if (!domainColor) {
    return {
      foreground: 'rgb(55, 65, 81)',
      background: 'rgb(243, 244, 246)',
      border: 'rgb(229, 231, 235)',
      dotColor: 'rgb(107, 114, 128)',
    };
  }

  const rgb = _hexToRgb(domainColor);
  if (!rgb) {
    return {
      foreground: '#000000',
      background: domainColor,
      border: domainColor,
      dotColor: '#000000',
    };
  }

  const luminance = _getLuminance(rgb.r, rgb.g, rgb.b);
  const textColor =
    luminance > 0.5 ? _darkenColor(rgb.r, rgb.g, rgb.b, 0.4) : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  return {
    foreground: textColor,
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    dotColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}
