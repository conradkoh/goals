import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useState, useMemo, useEffect } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { useWeek } from '@/hooks/useWeek';
import { DayProvider, useDay } from '@/hooks/useDay';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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

interface WeeklyGoalOption {
  id: Id<'goals'>;
  title: string;
  quarterlyGoalTitle: string;
}

export const WeekCardDailyGoals = ({ weekNumber }: WeekCardDailyGoalsProps) => {
  const { days, weeklyGoals } = useWeek();
  const { createDailyGoal } = useDashboard();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => {
    const today = new Date().getDay();
    return today === 0 ? DayOfWeek.SUNDAY : (today as DayOfWeek);
  });
  const [selectedWeeklyGoalId, setSelectedWeeklyGoalId] = useState<string>('');

  // Get the available weekly goals for the selected day
  const availableWeeklyGoals = useMemo(() => {
    const selectedDay = (days as DayData[]).find(
      (d) => d.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) return [];

    return (
      weeklyGoals
        .map((g) => ({
          id: g._id,
          title: g.title,
          quarterlyGoalTitle: g.parentTitle ?? 'Unknown Quarterly Goal',
        }))
        .sort((a, b) => a.title.localeCompare(b.title)) ?? []
    );
  }, [days, selectedDayOfWeek, weeklyGoals]);

  // Set the first available goal as default when the list changes
  useEffect(() => {
    if (availableWeeklyGoals.length > 0 && !selectedWeeklyGoalId) {
      setSelectedWeeklyGoalId(availableWeeklyGoals[0].id);
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
        parentId: selectedWeeklyGoalId as Id<'goals'>,
        weekNumber,
        dayOfWeek: selectedDayOfWeek,
        dateTimestamp: selectedDay.dateTimestamp,
      });
      setNewGoalTitle('');
      // Keep the selected day but reset the weekly goal
      setSelectedWeeklyGoalId('');
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-3">
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
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DayOfWeek).map(([name, value]) => (
                    <SelectItem key={value} value={value.toString()}>
                      {getDayName(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-2/3">
              <Select
                value={selectedWeeklyGoalId}
                onValueChange={setSelectedWeeklyGoalId}
              >
                <SelectTrigger className="h-12 text-xs">
                  <SelectValue>
                    {selectedWeeklyGoalId ? (
                      <div className="py-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate">
                            {
                              availableWeeklyGoals.find(
                                (g) => g.id === selectedWeeklyGoalId
                              )?.title
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {
                            availableWeeklyGoals.find(
                              (g) => g.id === selectedWeeklyGoalId
                            )?.quarterlyGoalTitle
                          }
                        </div>
                      </div>
                    ) : (
                      <div className="py-1">
                        <span>Select weekly goal</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableWeeklyGoals.length > 0 ? (
                    availableWeeklyGoals.map((goal: WeeklyGoalOption) => (
                      <SelectItem
                        key={goal.id}
                        value={goal.id}
                        className="h-12"
                      >
                        <div className="py-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{goal.title}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {goal.quarterlyGoalTitle}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="h-12">
                      <div className="py-1">
                        <span className="text-gray-500">
                          No starred or pinned goals
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CreateGoalInput>
      </div>
      <div className="space-y-2">
        {(days as DayData[]).map((day) => (
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
      await createDailyGoal({
        title: title.trim(),
        parentId: weeklyGoal._id,
        weekNumber: weeklyGoal.state?.weekNumber!,
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
