import {
  DayContainer,
  wasCompletedToday,
} from '@/components/molecules/day-of-week/containers/DayContainer';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, DayOfWeekType } from '@/lib/constants';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { AddTaskInput } from '@/components/atoms/AddTaskInput';
import { useToast } from '@/components/ui/use-toast';

export interface FocusModeDailyViewDailyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  selectedDayOfWeek: DayOfWeek;
}

export const FocusModeDailyViewDailyGoals = ({
  weekNumber,
  year,
  quarter,
  selectedDayOfWeek,
}: FocusModeDailyViewDailyGoalsProps) => {
  const {
    days,
    weeklyGoals,
    quarterlyGoals,
    createDailyGoalOptimistic,
    dailyGoals,
    deleteGoalOptimistic,
    createWeeklyGoalOptimistic,
  } = useWeek();
  const { updateQuarterlyGoalTitle } = useGoalActions();
  const { toast } = useToast();

  // Add state to track which goals are being created
  const [creatingGoals, setCreatingGoals] = useState<Record<string, boolean>>(
    {}
  );

  // State for weekly goal creation
  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState('');
  const [selectedQuarterlyGoalId, setSelectedQuarterlyGoalId] =
    useState<Id<'goals'> | null>(null);
  const [isCreatingWeeklyGoal, setIsCreatingWeeklyGoal] = useState(false);

  // Find the current day data
  const currentDay = useMemo(() => {
    const currentDayData = (
      days as Array<{
        dayOfWeek: DayOfWeekType;
        date: string;
        dateTimestamp: number;
      }>
    ).find((day) => day.dayOfWeek === selectedDayOfWeek);

    return currentDayData;
  }, [days, selectedDayOfWeek]);

  // Function to sort daily goals
  const sortDailyGoals = (goals: GoalWithDetailsAndChildren[]) => {
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
        if (quarterlyGoalA.state?.isStarred && !quarterlyGoalB.state?.isStarred)
          return -1;
        if (!quarterlyGoalA.state?.isStarred && quarterlyGoalB.state?.isStarred)
          return 1;

        // Sort by pinned status
        if (quarterlyGoalA.state?.isPinned && !quarterlyGoalB.state?.isPinned)
          return -1;
        if (!quarterlyGoalA.state?.isPinned && quarterlyGoalB.state?.isPinned)
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
  };

  // Prepare weekly goals with children for the selected day
  const preparedWeeklyGoalsForDay = useMemo(() => {
    // Get all weekly goals with valid parents that aren't completed
    // We no longer filter out weekly goals without daily goals here since DayContainer in 'focus' mode handles that
    const validWeeklyGoals = [...weeklyGoals]
      .filter((weeklyGoal) => {
        // Check if weekly goal has a valid parent
        if (!weeklyGoal.parentId) {
          return false;
        }

        // Filter out completed weekly goals unless they were completed today
        if (weeklyGoal.state?.isComplete) {
          // Get the current day's date timestamp
          const currentDayData = (
            days as Array<{
              dayOfWeek: DayOfWeekType;
              date: string;
              dateTimestamp: number;
            }>
          ).find((day) => day.dayOfWeek === selectedDayOfWeek);

          if (
            currentDayData &&
            wasCompletedToday(weeklyGoal, currentDayData.dateTimestamp)
          ) {
            return true; // Include goals completed today
          }
          return false; // Filter out other completed goals
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
    const groupedByQuarterlyGoal: Record<string, typeof validWeeklyGoals> = {};
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
        // First by completion status (already filtered for incomplete, but keeping for future flexibility)
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

  // Get sorted quarterly goals for the weekly goal creation dropdown
  const sortedQuarterlyGoals = useMemo(() => {
    return [...quarterlyGoals].sort((a, b) => {
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
    });
  }, [quarterlyGoals]);

  const handleUpdateGoalTitle = (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => {
    return updateQuarterlyGoalTitle({ goalId, title, details });
  };

  const handleDeleteGoal = async (goalId: Id<'goals'>): Promise<void> => {
    await deleteGoalOptimistic(goalId);
  };

  const handleCreateGoal = async (
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

    // Set the creating state for this weekly goal
    setCreatingGoals((prev) => ({ ...prev, [weeklyGoalId]: true }));

    try {
      await createDailyGoalOptimistic(
        weeklyGoalId,
        title,
        dayOfWeekToUse,
        dateTimestamp
      );
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    } finally {
      // Clear the creating state
      setCreatingGoals((prev) => {
        const newState = { ...prev };
        delete newState[weeklyGoalId];
        return newState;
      });
    }
  };

  // Handle creating a new weekly goal
  const handleCreateWeeklyGoal = async () => {
    if (!newWeeklyGoalTitle.trim() || !selectedQuarterlyGoalId) {
      toast({
        title: 'Cannot create weekly goal',
        description: 'Please enter a title and select a quarterly goal',
        variant: 'destructive',
      });
      return;
    }

    const titleToCreate = newWeeklyGoalTitle.trim();
    setNewWeeklyGoalTitle(''); // Clear input immediately for better UX
    setIsCreatingWeeklyGoal(true);

    try {
      await createWeeklyGoalOptimistic(selectedQuarterlyGoalId, titleToCreate);
    } catch (error) {
      console.error('Failed to create weekly goal:', error);
      toast({
        title: 'Failed to create weekly goal',
        description:
          'There was an error creating your weekly goal. Please try again.',
        variant: 'destructive',
      });
      setNewWeeklyGoalTitle(titleToCreate); // Restore the title on error
    } finally {
      setIsCreatingWeeklyGoal(false);
    }
  };

  // If the current day doesn't exist, don't render anything
  if (!currentDay) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Weekly Goal Creation Section */}
      <div className="bg-white rounded-lg p-3 border border-gray-100 mb-4">
        <h3 className="text-sm font-medium mb-2">Add Weekly Goal</h3>
        <div className="space-y-2">
          <div>
            <label
              htmlFor="quarterlyGoal"
              className="text-xs text-gray-500 block mb-1"
            >
              Quarterly Goal
            </label>
            <select
              id="quarterlyGoal"
              className="w-full p-2 text-sm border border-gray-200 rounded-md"
              value={selectedQuarterlyGoalId?.toString() || ''}
              onChange={(e) =>
                setSelectedQuarterlyGoalId(e.target.value as Id<'goals'>)
              }
            >
              <option value="">Select a quarterly goal</option>
              {sortedQuarterlyGoals.map((goal) => (
                <option key={goal._id.toString()} value={goal._id.toString()}>
                  {goal.title} {goal.state?.isStarred ? '⭐' : ''}{' '}
                  {goal.state?.isPinned ? '📌' : ''}
                </option>
              ))}
            </select>
          </div>

          <CreateGoalInput
            placeholder="Add a weekly goal..."
            value={newWeeklyGoalTitle}
            onChange={setNewWeeklyGoalTitle}
            onSubmit={handleCreateWeeklyGoal}
            disabled={isCreatingWeeklyGoal}
          />
        </div>
      </div>

      {/* Daily Goals Section */}
      <DayContainer
        dayOfWeek={currentDay.dayOfWeek}
        weekNumber={weekNumber}
        dateTimestamp={currentDay.dateTimestamp}
        weeklyGoalsWithQuarterly={preparedWeeklyGoalsForDay}
        onUpdateGoalTitle={handleUpdateGoalTitle}
        onDeleteGoal={handleDeleteGoal}
        onCreateGoal={handleCreateGoal}
        sortDailyGoals={sortDailyGoals}
        mode="focus"
        isCreating={creatingGoals}
      />
    </div>
  );
};
