import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useState, useMemo, useEffect } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { useWeek } from '@/hooks/useWeek';
import { DayProvider, useDay } from '@/hooks/useDay';
import { GoalSelector } from '../../goals-new/GoalSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CollapsibleMinimal,
  CollapsibleMinimalTrigger,
  CollapsibleMinimalContent,
} from '@/components/ui/collapsible-minimal';

// Day of week constants
const DayOfWeek = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

const getDayName = (dayOfWeek: number): string => {
  const names = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return names[dayOfWeek - 1];
};

interface WeekCardDailyGoalsProps {
  weekNumber: number;
}

interface DayData {
  dayOfWeek: number;
  date: string;
  dateTimestamp: number;
  dailyGoalsView?: {
    weeklyGoals: Array<{
      weeklyGoal: GoalWithDetailsAndChildren;
      quarterlyGoal: GoalWithDetailsAndChildren;
    }>;
  };
}

// Helper to get the start of day timestamp
const getStartOfDay = (date: Date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
};

export const WeekCardDailyGoals = ({ weekNumber }: WeekCardDailyGoalsProps) => {
  const { days, weeklyGoals } = useWeek();
  const { createDailyGoal } = useDashboard();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isPastDaysExpanded, setIsPastDaysExpanded] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => {
    const today = new Date().getDay();
    return today === 0 ? DayOfWeek.SUNDAY : (today as DayOfWeek);
  });
  const [selectedWeeklyGoalId, setSelectedWeeklyGoalId] =
    useState<Id<'goals'>>();

  // Sort and categorize days
  const { currentDay, futureDays, pastDays } = useMemo(() => {
    const now = getStartOfDay(new Date());
    const sortedDays = [...(days as DayData[])];

    // Find current day
    const currentDayData = sortedDays.find(
      (d) => getStartOfDay(new Date(d.dateTimestamp)) === now
    );

    // Separate future and past days
    const future = sortedDays
      .filter((d) => getStartOfDay(new Date(d.dateTimestamp)) > now)
      .sort((a, b) => a.dateTimestamp - b.dateTimestamp); // Sort chronologically

    const past = sortedDays
      .filter((d) => getStartOfDay(new Date(d.dateTimestamp)) < now)
      .sort((a, b) => b.dateTimestamp - a.dateTimestamp); // Sort reverse chronologically

    return {
      currentDay: currentDayData,
      futureDays: future,
      pastDays: past,
    };
  }, [days]);

  // Calculate past days summary
  const pastDaysSummary = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;

    pastDays.forEach((day) => {
      day.dailyGoalsView?.weeklyGoals.forEach(({ weeklyGoal }) => {
        const dailyGoals = weeklyGoal.children.filter(
          (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === day.dayOfWeek
        );
        totalTasks += dailyGoals.length;
        completedTasks += dailyGoals.filter(
          (goal) => goal.state?.isComplete
        ).length;
      });
    });

    return { totalTasks, completedTasks };
  }, [pastDays]);

  // Get the available weekly goals for the selected day, sorted appropriately
  const availableWeeklyGoals = useMemo(() => {
    const selectedDay = (days as DayData[]).find(
      (d) => d.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) return [];

    return weeklyGoals.sort((a, b) => {
      // First by starred status
      if (a.state?.isStarred && !b.state?.isStarred) return -1;
      if (!a.state?.isStarred && b.state?.isStarred) return 1;
      // Then by pinned status
      if (a.state?.isPinned && !b.state?.isPinned) return -1;
      if (!a.state?.isPinned && b.state?.isPinned) return 1;
      // Finally alphabetically
      return a.title.localeCompare(b.title);
    });
  }, [days, selectedDayOfWeek, weeklyGoals]);

  // Auto-select first goal when list changes and nothing is selected
  useEffect(() => {
    if (availableWeeklyGoals.length > 0 && !selectedWeeklyGoalId) {
      setSelectedWeeklyGoalId(availableWeeklyGoals[0]._id);
    }
  }, [availableWeeklyGoals, selectedWeeklyGoalId]);

  const handleCreateDailyGoal = async () => {
    if (!newGoalTitle.trim() || !selectedWeeklyGoalId || !selectedDayOfWeek)
      return;

    const selectedDay = (days as DayData[]).find(
      (d) => d.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) return;

    try {
      await createDailyGoal({
        title: newGoalTitle.trim(),
        parentId: selectedWeeklyGoalId,
        weekNumber,
        dayOfWeek: selectedDayOfWeek,
        dateTimestamp: selectedDay.dateTimestamp,
      });
      setNewGoalTitle('');
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Past Days Collapsible Section - Always First */}
      {pastDays.length > 0 && (
        <CollapsibleMinimal
          open={isPastDaysExpanded}
          onOpenChange={setIsPastDaysExpanded}
        >
          <CollapsibleMinimalTrigger>
            <div className="flex justify-between w-full">
              <span className="font-medium">Past Days</span>
              <span className="text-gray-600">
                {pastDaysSummary.completedTasks}/{pastDaysSummary.totalTasks}{' '}
                tasks completed
              </span>
            </div>
          </CollapsibleMinimalTrigger>
          <CollapsibleMinimalContent>
            {pastDays.map((day) => (
              <DayProvider
                key={day.dayOfWeek}
                dayOfWeek={day.dayOfWeek}
                date={day.date}
                dateTimestamp={day.dateTimestamp}
              >
                <DaySection />
              </DayProvider>
            ))}
          </CollapsibleMinimalContent>
        </CollapsibleMinimal>
      )}
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
            <div className="w-2/3">
              <GoalSelector
                goals={availableWeeklyGoals}
                value={selectedWeeklyGoalId}
                onChange={setSelectedWeeklyGoalId}
                placeholder="Select weekly goal"
              />
            </div>
          </div>
        </CreateGoalInput>
      </div>
      <div className="space-y-2">
        {/* Current Day */}
        {currentDay && (
          <DayProvider
            key={currentDay.dayOfWeek}
            dayOfWeek={currentDay.dayOfWeek}
            date={currentDay.date}
            dateTimestamp={currentDay.dateTimestamp}
          >
            <DaySection />
          </DayProvider>
        )}

        {/* Future Days */}
        {futureDays.map((day) => (
          <DayProvider
            key={day.dayOfWeek}
            dayOfWeek={day.dayOfWeek}
            date={day.date}
            dateTimestamp={day.dateTimestamp}
          >
            <DaySection />
          </DayProvider>
        ))}
      </div>
    </div>
  );
};

const DaySection = () => {
  const { createDailyGoal, updateQuarterlyGoalTitle, deleteQuarterlyGoal } =
    useDashboard();
  const { dayOfWeek, dateTimestamp, dailyGoalsView } = useDay();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  const handleCreateDailyGoal = async (
    weeklyGoal: GoalWithDetailsAndChildren,
    dayOfWeek: DayOfWeek,
    dateTimestamp: number
  ) => {
    const title = newGoalTitles[weeklyGoal._id];
    if (!title?.trim()) return;

    try {
      const weekNumber = weeklyGoal.state?.weekNumber;
      if (!weekNumber) {
        console.error('Week number is not defined for goal');
        return;
      }
      await createDailyGoal({
        title: title.trim(),
        parentId: weeklyGoal._id,
        weekNumber,
        dayOfWeek,
        dateTimestamp,
      });
      setNewGoalTitles((prev) => ({
        ...prev,
        [weeklyGoal._id]: '',
      }));
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    }
  };

  const handleUpdateTitle = async (goalId: Id<'goals'>, newTitle: string) => {
    await updateQuarterlyGoalTitle({
      goalId,
      title: newTitle,
    });
  };

  const handleDeleteGoal = async (goalId: Id<'goals'>) => {
    await deleteQuarterlyGoal({
      goalId,
    });
  };

  return (
    <div className="space-y-2 pb-6 border-b border-gray-100 last:border-b-0">
      <DayHeader dayOfWeek={dayOfWeek} />
      <div className="px-3">
        {dailyGoalsView.weeklyGoals.map(({ weeklyGoal, quarterlyGoal }) => (
          <DailyGoalGroup
            key={weeklyGoal._id}
            weeklyGoal={weeklyGoal}
            quarterlyGoal={quarterlyGoal}
            dayOfWeek={dayOfWeek}
            onCreateGoal={() =>
              handleCreateDailyGoal(
                weeklyGoal,
                dayOfWeek as DayOfWeek,
                dateTimestamp
              )
            }
            onUpdateGoalTitle={handleUpdateTitle}
            onDeleteGoal={handleDeleteGoal}
            newGoalTitle={newGoalTitles[weeklyGoal._id] || ''}
            onNewGoalTitleChange={(value) =>
              setNewGoalTitles((prev) => ({
                ...prev,
                [weeklyGoal._id]: value,
              }))
            }
          />
        ))}
      </div>
    </div>
  );
};

interface DailyGoalItemProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}

// Simple presentational component for a daily goal
const DailyGoalItem = ({
  goal,
  onUpdateTitle,
  onDelete,
}: DailyGoalItemProps) => {
  const { toggleGoalCompletion } = useDashboard();
  const { weekNumber } = useWeek();
  const isComplete = goal.state?.isComplete ?? false;

  return (
    <div className="py-1 text-sm flex items-center gap-2">
      <input
        type="checkbox"
        checked={isComplete}
        onChange={(e) =>
          toggleGoalCompletion({
            goalId: goal._id,
            weekNumber,
            isComplete: e.target.checked,
          })
        }
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <EditableGoalTitle
        title={goal.title}
        onSubmit={(newTitle) => onUpdateTitle(goal._id, newTitle)}
        onDelete={() => onDelete(goal._id)}
      />
    </div>
  );
};

interface DailyGoalGroupProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: number;
  onCreateGoal: () => void;
  onUpdateGoalTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  newGoalTitle: string;
  onNewGoalTitleChange: (value: string) => void;
}

// Component for a group of daily goals under a weekly goal
const DailyGoalGroup = ({
  weeklyGoal,
  quarterlyGoal,
  dayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
}: DailyGoalGroupProps) => {
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  return (
    <div className="mb-4 last:mb-0">
      <div className="space-y-0.5 mb-2">
        <div className="font-semibold text-gray-800">{weeklyGoal.title}</div>
        <div className="text-sm text-gray-500">{quarterlyGoal.title}</div>
      </div>
      <div className="space-y-1">
        {dailyGoals.map((dailyGoal) => (
          <DailyGoalItem
            key={dailyGoal._id}
            goal={dailyGoal}
            onUpdateTitle={onUpdateGoalTitle}
            onDelete={onDeleteGoal}
          />
        ))}
      </div>
    </div>
  );
};

interface DayHeaderProps {
  dayOfWeek: number;
}

// Simple presentational component for the day header
const DayHeader = ({ dayOfWeek }: DayHeaderProps) => (
  <div className="bg-gray-100 py-1 px-3 rounded-md mb-3">
    <div className="text-sm font-bold text-gray-900">
      {getDayName(dayOfWeek)}
    </div>
  </div>
);
