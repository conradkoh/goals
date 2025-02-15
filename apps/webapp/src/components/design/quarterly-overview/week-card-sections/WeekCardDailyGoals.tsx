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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SafeHTML } from '@/components/ui/safe-html';
import { Edit2 } from 'lucide-react';
import { DeleteGoalIconButton } from '../../goals-new/DeleteGoalIconButton';
import { GoalEditPopover } from '../../goals-new/GoalEditPopover';
import { cn } from '@/lib/utils';

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
    const today = new Date();
    const todayTimestamp = getStartOfDay(today);

    // Check if any of the days in this week match today's date
    const isCurrentWeek = days?.some(
      (day) => getStartOfDay(new Date(day.dateTimestamp)) === todayTimestamp
    );

    // If we're in the current week, select today's day
    if (isCurrentWeek) {
      const todayDayNumber = today.getDay();
      return todayDayNumber === 0
        ? DayOfWeek.SUNDAY
        : (todayDayNumber as DayOfWeek);
    }

    // Otherwise, select Monday by default
    return DayOfWeek.MONDAY;
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
                emptyStateMessage="No weekly goals available"
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

  const handleUpdateTitle = async (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => {
    await updateQuarterlyGoalTitle({
      goalId,
      title,
      details,
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
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
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
    <div className="group px-2 py-1 hover:bg-gray-50 rounded-sm">
      <div className="text-sm flex items-center gap-2 group/title">
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

        {/* View Mode */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0"
            >
              <span className="truncate">{goal.title}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{goal.title}</h3>
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  onSave={async (title, details) => {
                    await onUpdateTitle(goal._id, title, details);
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
              {goal.details && (
                <SafeHTML html={goal.details} className="mt-2 text-sm" />
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1">
          <GoalEditPopover
            title={goal.title}
            details={goal.details}
            onSave={async (title, details) => {
              await onUpdateTitle(goal._id, title, details);
            }}
            trigger={
              <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            }
          />
          <DeleteGoalIconButton onDelete={() => onDelete(goal._id)} />
        </div>
      </div>
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

  // Calculate if all daily goals are complete
  const isSoftComplete =
    dailyGoals.length > 0 && dailyGoals.every((goal) => goal.state?.isComplete);

  return (
    <div className="mb-4 last:mb-0">
      <div
        className={cn(
          'rounded-md p-3 transition-colors',
          isSoftComplete ? 'bg-green-50' : 'hover:bg-gray-50'
        )}
      >
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
