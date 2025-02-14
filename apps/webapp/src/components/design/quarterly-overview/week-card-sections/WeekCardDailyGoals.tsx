import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useState } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { useWeek } from '@/hooks/useWeek';
import { DayProvider, useDay } from '@/hooks/useDay';

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

export const WeekCardDailyGoals = ({ weekNumber }: WeekCardDailyGoalsProps) => {
  const { days } = useWeek();

  return (
    <div className="space-y-2">
      {days.map((day) => (
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
}: DailyGoalItemProps) => (
  <div className="py-1 text-sm">
    <EditableGoalTitle
      title={goal.title}
      onSubmit={(newTitle) => onUpdateTitle(goal._id, newTitle)}
      onDelete={() => onDelete(goal._id)}
    />
  </div>
);

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
  onCreateGoal,
  onUpdateGoalTitle,
  onDeleteGoal,
  newGoalTitle,
  onNewGoalTitleChange,
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
        <CreateGoalInput
          placeholder="Add goal..."
          value={newGoalTitle}
          onChange={onNewGoalTitleChange}
          onSubmit={onCreateGoal}
        />
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
