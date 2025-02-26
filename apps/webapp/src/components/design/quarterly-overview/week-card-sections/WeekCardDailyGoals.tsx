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
} from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { DayContainer, PastDaysContainer } from '../../goals-new/day-of-week';
import { GoalSelector } from '../../goals-new/GoalSelector';

export interface WeekCardDailyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  showOnlyToday?: boolean;
  selectedDayOverride?: DayOfWeek;
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

export const WeekCardDailyGoals = forwardRef<
  WeekCardDailyGoalsRef,
  WeekCardDailyGoalsProps
>(({ weekNumber, year, showOnlyToday, selectedDayOverride }, ref) => {
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
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => {
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
  });
  const [selectedWeeklyGoalId, setSelectedWeeklyGoalId] =
    useState<Id<'goals'>>();
  const [isCreating, setIsCreating] = useState(false);

  // Sort and categorize days
  const { currentDay, futureDays, pastDays } = useMemo(() => {
    const todayWeekNumber = currentDateTime.weekNumber;
    const todayDayOfWeek = currentDateTime.weekday as DayOfWeekType;
    const sortedDays = [...(days as DayData[])];

    if (selectedDayOverride && showOnlyToday) {
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
    showOnlyToday,
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

  // Get the available weekly goals for the selected day, sorted appropriately
  const availableWeeklyGoals = useMemo(() => {
    const selectedDay = (days as DayData[]).find(
      (d) => d.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) return [];

    return weeklyGoals.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  }, [days, selectedDayOfWeek, weeklyGoals]);

  // Function to sort daily goals
  const sortDailyGoals = (goals: GoalWithDetailsAndChildren[]) => {
    return [...goals].sort((a, b) => {
      // First sort by completion status
      if (!a.state?.isComplete && b.state?.isComplete) return -1;
      if (a.state?.isComplete && !b.state?.isComplete) return 1;

      // Finally sort alphabetically
      return a.title.localeCompare(b.title);
    });
  };

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
        description: 'There was an error creating your goal. Please try again.',
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

  // Prepare data for each day section
  // Weekly goals are the same across all days
  const prepareWeeklyGoalsForDay = () => {
    // Get all weekly goals with valid parents
    // The actual filtering by day happens in the DailyGoalGroup component
    return weeklyGoals
      .filter((weeklyGoal) => {
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
  };

  const handleUpdateGoalTitle = (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => {
    return updateQuarterlyGoalTitle({ goalId, title, details });
  };

  const handleDeleteGoal = async (goalId: Id<'goals'>): Promise<void> => {
    const goal = dailyGoals.find((g) => g._id === goalId);
    if (!goal || !goal.state?.daily?.dayOfWeek) return;
    await deleteDailyGoalOptimistic(goalId);
  };

  const handleCreateGoal = async (
    weeklyGoalId: Id<'goals'>,
    title: string
  ): Promise<void> => {
    const dateTimestamp = DateTime.fromObject({
      weekNumber,
      weekYear: year,
    })
      .startOf('week')
      .plus({ days: selectedDayOfWeek - 1 })
      .toMillis();

    await createDailyGoalOptimistic(
      weeklyGoalId,
      title,
      selectedDayOfWeek,
      dateTimestamp
    );
  };

  return (
    <div className="space-y-4">
      {!showOnlyToday && pastDays.length > 0 && (
        <PastDaysContainer
          days={pastDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            weekNumber,
            dateTimestamp: day.dateTimestamp,
            weeklyGoalsWithQuarterly: prepareWeeklyGoalsForDay(),
          }))}
          onUpdateGoalTitle={handleUpdateGoalTitle}
          onDeleteGoal={handleDeleteGoal}
          onCreateGoal={handleCreateGoal}
          isCreating={isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}}
          completedTasks={pastDaysSummary.completedTasks}
          totalTasks={pastDaysSummary.totalTasks}
          sortDailyGoals={sortDailyGoals}
        />
      )}
      {!showOnlyToday && (
        <div>
          <CreateGoalInput
            placeholder="Add a daily goal..."
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
      )}
      <div className="space-y-2">
        {currentDay && (
          <DayContainer
            dayOfWeek={currentDay.dayOfWeek}
            weekNumber={weekNumber}
            dateTimestamp={currentDay.dateTimestamp}
            weeklyGoalsWithQuarterly={prepareWeeklyGoalsForDay()}
            onUpdateGoalTitle={handleUpdateGoalTitle}
            onDeleteGoal={handleDeleteGoal}
            onCreateGoal={handleCreateGoal}
            isCreating={
              isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}
            }
            sortDailyGoals={sortDailyGoals}
          />
        )}

        {!showOnlyToday &&
          futureDays.map((day) => (
            <DayContainer
              key={day.dayOfWeek}
              dayOfWeek={day.dayOfWeek}
              weekNumber={weekNumber}
              dateTimestamp={day.dateTimestamp}
              weeklyGoalsWithQuarterly={prepareWeeklyGoalsForDay()}
              onUpdateGoalTitle={handleUpdateGoalTitle}
              onDeleteGoal={handleDeleteGoal}
              onCreateGoal={handleCreateGoal}
              isCreating={
                isCreating ? { [selectedWeeklyGoalId ?? '']: true } : {}
              }
              sortDailyGoals={sortDailyGoals}
            />
          ))}
      </div>
    </div>
  );
});

WeekCardDailyGoals.displayName = 'WeekCardDailyGoals';
