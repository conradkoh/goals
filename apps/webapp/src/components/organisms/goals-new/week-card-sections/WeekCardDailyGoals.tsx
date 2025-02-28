import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import {
  DayContainer,
  DayContainerMode,
} from '@/components/molecules/day-of-week/containers/DayContainer';
import { PastDaysContainer } from '@/components/molecules/day-of-week/containers/PastDaysContainer';
import { GoalSelector } from '@/components/atoms/GoalSelector';
import { Skeleton } from '@/components/ui/skeleton';

export interface WeekCardDailyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  selectedDayOverride?: DayOfWeek;
  mode?: DayContainerMode;
  isLoading?: boolean;
}

interface DayData {
  dayOfWeek: DayOfWeekType;
  date: string;
  dateTimestamp: number;
  dailyGoalsView?: {
    weeklyGoals: Array<{
      weeklyGoal: GoalWithDetailsAndChildren;
      quarterlyGoal: GoalWithDetailsAndChildren;
    }>;
  };
}

export interface WeekCardDailyGoalsRef {
  openFocusMode: () => void;
}

// Loading skeleton for daily goals
const DailyGoalsSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-32" /> {/* Day selector */}
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-5/6" />
      <Skeleton className="h-10 w-4/5" />
    </div>
  </div>
);

export const WeekCardDailyGoals = forwardRef<
  WeekCardDailyGoalsRef,
  WeekCardDailyGoalsProps
>(
  (
    {
      weekNumber,
      year,
      quarter,
      selectedDayOverride,
      mode = 'plan',
      isLoading = false,
    }: WeekCardDailyGoalsProps,
    ref
  ) => {
    const {
      days,
      weeklyGoals,
      quarterlyGoals,
      createDailyGoalOptimistic,
      dailyGoals,
      deleteDailyGoalOptimistic,
    } = useWeek();
    const { updateQuarterlyGoalTitle } = useGoalActions();
    const currentDateTime = useCurrentDateTime();
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(
      () => {
        const todayWeekNumber = currentDateTime.weekNumber;
        const todayDayOfWeek = currentDateTime.weekday as DayOfWeek;

        if (selectedDayOverride) {
          return selectedDayOverride;
        }

        const isCurrentWeek = weekNumber === todayWeekNumber;
        if (isCurrentWeek) {
          return todayDayOfWeek;
        }

        return DayOfWeek.MONDAY;
      }
    );
    const [selectedWeeklyGoalId, setSelectedWeeklyGoalId] =
      useState<Id<'goals'>>();
    const [isCreating, setIsCreating] = useState(false);

    // Sort and categorize days
    const { currentDay, futureDays, pastDays } = useMemo(() => {
      const todayWeekNumber = currentDateTime.weekNumber;
      const todayDayOfWeek = currentDateTime.weekday as DayOfWeekType;
      const sortedDays = [...(days as DayData[])];

      if (selectedDayOverride) {
        const selectedDayData = sortedDays.find(
          (d) => d.dayOfWeek === selectedDayOverride
        );
        return {
          currentDay: selectedDayData,
          futureDays: [],
          pastDays: [],
        };
      }

      const currentDayData = sortedDays.find(
        (d) => weekNumber === todayWeekNumber && d.dayOfWeek === todayDayOfWeek
      );

      const future = sortedDays
        .filter((d) => {
          if (weekNumber > todayWeekNumber) return true;
          if (weekNumber < todayWeekNumber) return false;
          return d.dayOfWeek > todayDayOfWeek;
        })
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      const past = sortedDays
        .filter((d) => {
          if (weekNumber < todayWeekNumber) return true;
          if (weekNumber > todayWeekNumber) return false;
          return d.dayOfWeek < todayDayOfWeek;
        })
        .sort((a, b) => b.dayOfWeek - a.dayOfWeek);

      return {
        currentDay: currentDayData,
        futureDays: future,
        pastDays: past,
      };
    }, [
      days,
      weekNumber,
      selectedDayOverride,
      currentDateTime.weekNumber,
      currentDateTime.weekday,
    ]);

    // Calculate past days summary
    const pastDaysSummary = useMemo(() => {
      if (!pastDays || pastDays.length === 0) {
        return { totalTasks: 0, completedTasks: 0 };
      }

      let totalTasks = 0;
      let completedTasks = 0;

      const pastDayNumbers = pastDays.map((day) => day.dayOfWeek);

      if (dailyGoals && dailyGoals.length > 0) {
        dailyGoals.forEach((goal) => {
          if (
            goal.state?.daily &&
            pastDayNumbers.includes(goal.state.daily.dayOfWeek)
          ) {
            totalTasks++;
            if (goal.state.isComplete) {
              completedTasks++;
            }
          }
        });
      }

      return { totalTasks, completedTasks };
    }, [pastDays, dailyGoals]);

    // Get the available weekly goals for the selected day, sorted alphabetically for the dropdown selector
    const availableWeeklyGoals = useMemo(() => {
      // Create a copy of the array before sorting to avoid mutating the original
      return [...weeklyGoals].sort((a, b) => {
        return a.title.localeCompare(b.title);
      });
    }, [weeklyGoals]);

    // Function to sort daily goals
    const sortDailyGoals = useCallback(
      (goals: GoalWithDetailsAndChildren[]) => {
        return [...goals].sort((a, b) => {
          // First sort by completion status
          if (!a.state?.isComplete && b.state?.isComplete) return -1;
          if (a.state?.isComplete && !b.state?.isComplete) return 1;

          // Get parent weekly goals
          const weeklyGoalA = weeklyGoals.find((g) => g._id === a.parentId);
          const weeklyGoalB = weeklyGoals.find((g) => g._id === b.parentId);

          // Get parent quarterly goals
          const quarterlyGoalA = weeklyGoalA
            ? quarterlyGoals.find((g) => g._id === weeklyGoalA.parentId)
            : null;
          const quarterlyGoalB = weeklyGoalB
            ? quarterlyGoals.find((g) => g._id === weeklyGoalB.parentId)
            : null;

          // Sort by quarterly goal priority
          if (quarterlyGoalA && quarterlyGoalB) {
            // Sort by starred status
            if (
              quarterlyGoalA.state?.isStarred &&
              !quarterlyGoalB.state?.isStarred
            )
              return -1;
            if (
              !quarterlyGoalA.state?.isStarred &&
              quarterlyGoalB.state?.isStarred
            )
              return 1;

            // Sort by pinned status
            if (
              quarterlyGoalA.state?.isPinned &&
              !quarterlyGoalB.state?.isPinned
            )
              return -1;
            if (
              !quarterlyGoalA.state?.isPinned &&
              quarterlyGoalB.state?.isPinned
            )
              return 1;

            // If same priority, sort by quarterly goal title
            const quarterlyCompare = quarterlyGoalA.title.localeCompare(
              quarterlyGoalB.title
            );
            if (quarterlyCompare !== 0) return quarterlyCompare;

            // If same quarterly goal, sort by weekly goal title
            if (weeklyGoalA && weeklyGoalB) {
              const weeklyCompare = weeklyGoalA.title.localeCompare(
                weeklyGoalB.title
              );
              if (weeklyCompare !== 0) return weeklyCompare;
            }
          }

          // Finally sort by daily goal title
          return a.title.localeCompare(b.title);
        });
      },
      [weeklyGoals, quarterlyGoals]
    );

    // Auto-select first goal when list changes and nothing is selected
    useEffect(() => {
      if (availableWeeklyGoals.length > 0 && !selectedWeeklyGoalId) {
        setSelectedWeeklyGoalId(availableWeeklyGoals[0]._id);
      }
    }, [availableWeeklyGoals, selectedWeeklyGoalId]);

    const handleCreateDailyGoal = async () => {
      if (!newGoalTitle.trim() || !selectedWeeklyGoalId) return;

      const titleToCreate = newGoalTitle.trim();
      try {
        setNewGoalTitle('');
        setIsCreating(true);

        const dateTimestamp = DateTime.fromObject({
          weekNumber,
          weekYear: year,
        })
          .startOf('week')
          .plus({ days: selectedDayOfWeek - 1 })
          .toMillis();

        await createDailyGoalOptimistic(
          selectedWeeklyGoalId,
          titleToCreate,
          selectedDayOfWeek,
          dateTimestamp
        );
      } catch (error) {
        console.error('Failed to create daily goal:', error);
        setNewGoalTitle(titleToCreate);
        toast({
          variant: 'destructive',
          title: 'Failed to create goal',
          description:
            'There was an error creating your goal. Please try again.',
        });
      } finally {
        setIsCreating(false);
      }
    };

    useImperativeHandle(ref, () => ({
      openFocusMode: () => {
        // This is now a no-op since we're using direct navigation
      },
    }));

    // Prepare data for each day section, memoized to avoid unnecessary recalculations
    // This returns weekly goals sorted by priority for the day containers
    const weeklyGoalsWithQuarterly = useMemo(() => {
      // Get all weekly goals with valid parents
      const validWeeklyGoals = [...weeklyGoals]
        .filter((weeklyGoal) => {
          // Check if weekly goal has a valid parent
          if (!weeklyGoal.parentId) {
            console.debug(`Weekly goal ${weeklyGoal._id} has no parentId`);
            return false;
          }
          return true;
        })
        .map((weeklyGoal) => {
          const parentQuarterlyGoal = quarterlyGoals.find(
            (g) => g._id === weeklyGoal.parentId
          );
          if (!parentQuarterlyGoal) {
            console.warn(
              `Weekly goal ${weeklyGoal._id} has parentId ${weeklyGoal.parentId} but parent not found in quarterlyGoals`
            );
            return null;
          }
          return {
            weeklyGoal,
            quarterlyGoal: parentQuarterlyGoal,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Group weekly goals by their quarterly parent ID
      const groupedByQuarterlyGoal: Record<string, typeof validWeeklyGoals> =
        {};
      validWeeklyGoals.forEach((item) => {
        const quarterlyId = item.quarterlyGoal._id;
        if (!groupedByQuarterlyGoal[quarterlyId]) {
          groupedByQuarterlyGoal[quarterlyId] = [];
        }
        groupedByQuarterlyGoal[quarterlyId].push(item);
      });

      // Sort weekly goals within each quarterly group
      Object.values(groupedByQuarterlyGoal).forEach((group) => {
        group.sort((a, b) => {
          // First by completion status
          if (!a.weeklyGoal.state?.isComplete && b.weeklyGoal.state?.isComplete)
            return -1;
          if (a.weeklyGoal.state?.isComplete && !b.weeklyGoal.state?.isComplete)
            return 1;

          // Then by title
          return a.weeklyGoal.title.localeCompare(b.weeklyGoal.title);
        });
      });

      // Sort quarterly groups and flatten the result
      return Object.entries(groupedByQuarterlyGoal)
        .sort(([, groupA], [, groupB]) => {
          if (groupA.length === 0 || groupB.length === 0) return 0;

          const a = groupA[0].quarterlyGoal;
          const b = groupB[0].quarterlyGoal;

          // Sort by starred status first
          const aStarred = a.state?.isStarred ?? false;
          const bStarred = b.state?.isStarred ?? false;
          if (aStarred && !bStarred) return -1;
          if (!aStarred && bStarred) return 1;

          // Then sort by pinned status
          const aPinned = a.state?.isPinned ?? false;
          const bPinned = b.state?.isPinned ?? false;
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;

          // Finally sort by title
          return a.title.localeCompare(b.title);
        })
        .flatMap(([, group]) => group);
    }, [weeklyGoals, quarterlyGoals]);

    const handleUpdateGoalTitle = useCallback(
      (goalId: Id<'goals'>, title: string, details?: string) => {
        return updateQuarterlyGoalTitle({ goalId, title, details });
      },
      [updateQuarterlyGoalTitle]
    );

    const handleDeleteGoal = useCallback(
      async (goalId: Id<'goals'>): Promise<void> => {
        const goal = dailyGoals.find((g) => g._id === goalId);
        if (!goal || !goal.state?.daily?.dayOfWeek) return;
        await deleteDailyGoalOptimistic(goalId);
      },
      [dailyGoals, deleteDailyGoalOptimistic]
    );

    const handleCreateGoal = useCallback(
      async (
        weeklyGoalId: Id<'goals'>,
        title: string,
        forDayOfWeek?: DayOfWeek
      ): Promise<void> => {
        // Use the provided day of week if available, otherwise fall back to the selected day
        const dayOfWeekToUse = forDayOfWeek ?? selectedDayOfWeek;

        const dateTimestamp = DateTime.fromObject({
          weekNumber,
          weekYear: year,
        })
          .startOf('week')
          .plus({ days: dayOfWeekToUse - 1 })
          .toMillis();

        await createDailyGoalOptimistic(
          weeklyGoalId,
          title,
          dayOfWeekToUse,
          dateTimestamp
        );
      },
      [createDailyGoalOptimistic, weekNumber, year, selectedDayOfWeek]
    );

    // If loading, show skeleton
    if (isLoading) {
      return <DailyGoalsSkeleton />;
    }

    return (
      <div className="space-y-4">
        {pastDays.length > 0 && (
          <PastDaysContainer
            days={pastDays.map((day) => ({
              dayOfWeek: day.dayOfWeek,
              weekNumber,
              dateTimestamp: day.dateTimestamp,
              weeklyGoalsWithQuarterly: weeklyGoalsWithQuarterly,
            }))}
            onUpdateGoalTitle={handleUpdateGoalTitle}
            onDeleteGoal={handleDeleteGoal}
            onCreateGoal={handleCreateGoal}
            isCreating={
              isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}
            }
            completedTasks={pastDaysSummary.completedTasks}
            totalTasks={pastDaysSummary.totalTasks}
            sortDailyGoals={sortDailyGoals}
          />
        )}
        <div>
          <CreateGoalInput
            placeholder="Add a task..."
            value={newGoalTitle}
            onChange={setNewGoalTitle}
            onSubmit={handleCreateDailyGoal}
          >
            <div className="flex gap-2 items-start">
              <div className="w-1/3">
                <Select
                  value={selectedDayOfWeek.toString()}
                  onValueChange={(value) =>
                    setSelectedDayOfWeek(parseInt(value) as DayOfWeek)
                  }
                >
                  <SelectTrigger className="h-12 text-xs">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DayOfWeek).map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        {getDayName(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-2/3 relative">
                <GoalSelector
                  goals={availableWeeklyGoals}
                  value={selectedWeeklyGoalId}
                  onChange={(value) => setSelectedWeeklyGoalId(value)}
                  placeholder="Select weekly goal"
                  emptyStateMessage="No weekly goals available"
                />
                {isCreating && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Spinner className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          </CreateGoalInput>
        </div>
        <div className="space-y-2">
          {currentDay && (
            <DayContainer
              dayOfWeek={currentDay.dayOfWeek}
              weekNumber={weekNumber}
              dateTimestamp={currentDay.dateTimestamp}
              weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
              onUpdateGoalTitle={handleUpdateGoalTitle}
              onDeleteGoal={handleDeleteGoal}
              onCreateGoal={handleCreateGoal}
              isCreating={
                isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}
              }
              sortDailyGoals={sortDailyGoals}
              mode={mode}
            />
          )}

          {futureDays.map((day) => (
            <DayContainer
              key={day.dayOfWeek}
              dayOfWeek={day.dayOfWeek}
              weekNumber={weekNumber}
              dateTimestamp={day.dateTimestamp}
              weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
              onUpdateGoalTitle={handleUpdateGoalTitle}
              onDeleteGoal={handleDeleteGoal}
              onCreateGoal={handleCreateGoal}
              isCreating={
                isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}
              }
              sortDailyGoals={sortDailyGoals}
              mode={mode}
            />
          ))}
        </div>
      </div>
    );
  }
);

WeekCardDailyGoals.displayName = 'WeekCardDailyGoals';
