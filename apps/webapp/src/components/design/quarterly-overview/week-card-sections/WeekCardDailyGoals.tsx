import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useState } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';

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

// Internal component for rendering a daily goal
const DailyGoal = ({
  goal,
  onUpdateTitle,
  onDelete,
}: {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}) => (
  <div className="py-1 text-sm">
    <EditableGoalTitle
      title={goal.title}
      onSubmit={(newTitle) => onUpdateTitle(goal._id, newTitle)}
      onDelete={() => onDelete(goal._id)}
    />
  </div>
);

// Internal component for rendering a weekly goal section with its daily tasks
const WeeklyGoalSection = ({
  weeklyGoal,
  quarterlyGoal,
  dayOfWeek,
  onCreateGoal,
  onUpdateGoalTitle,
  onDeleteGoal,
  newGoalTitle,
  onNewGoalTitleChange,
}: {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: number;
  onCreateGoal: () => void;
  onUpdateGoalTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  newGoalTitle: string;
  onNewGoalTitleChange: (value: string) => void;
}) => (
  <div className="mb-4 last:mb-0">
    {/* Weekly Goal Title */}
    <div className="space-y-0.5 mb-2">
      <div className="font-semibold text-gray-800">{weeklyGoal.title}</div>
      <div className="text-sm text-gray-500">{quarterlyGoal.title}</div>
    </div>
    {(() => {
      console.log(dayOfWeek, { weeklyGoal });
      for (const child of weeklyGoal.children) {
        if (child.daily?.dayOfWeek === 1) {
          console.log({ child });
        }
      }
      return null;
    })()}
    {/* Daily Goals */}
    <div className="space-y-1">
      {weeklyGoal.children
        .filter((dailyGoal) => dailyGoal.daily?.dayOfWeek === dayOfWeek)
        .map((dailyGoal) => (
          <DailyGoal
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

// Internal component for rendering a day's content
const DaySection = ({
  day,
  weeklyGoalsData,
  onCreateGoal,
  onUpdateGoalTitle,
  onDeleteGoal,
  newGoalTitles,
  onNewGoalTitleChange,
}: {
  day: DayData;
  weeklyGoalsData: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  onCreateGoal: (weeklyGoal: GoalWithDetailsAndChildren) => void;
  onUpdateGoalTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  newGoalTitles: Record<string, string>;
  onNewGoalTitleChange: (weeklyGoalId: Id<'goals'>, value: string) => void;
}) => (
  <div className="space-y-2 pb-6 border-b border-gray-100 last:border-b-0">
    {/* Day of Week */}
    <div className="bg-gray-100 py-1 px-3 rounded-md mb-3">
      <div className="text-sm font-bold text-gray-900">
        {getDayName(day.dayOfWeek)}
      </div>
    </div>

    {/* Weekly Goals for this day */}
    <div className="px-3">
      {weeklyGoalsData.map(({ weeklyGoal, quarterlyGoal }) => (
        <WeeklyGoalSection
          key={weeklyGoal._id}
          weeklyGoal={weeklyGoal}
          quarterlyGoal={quarterlyGoal}
          dayOfWeek={day.dayOfWeek}
          onCreateGoal={() => onCreateGoal(weeklyGoal)}
          onUpdateGoalTitle={onUpdateGoalTitle}
          onDeleteGoal={onDeleteGoal}
          newGoalTitle={newGoalTitles[weeklyGoal._id] || ''}
          onNewGoalTitleChange={(value) =>
            onNewGoalTitleChange(weeklyGoal._id, value)
          }
        />
      ))}
    </div>
  </div>
);

interface WeekCardDailyGoalsProps {
  weekNumber: number;
  quarterlyGoals: GoalWithDetailsAndChildren[];
}

interface DayData {
  dayOfWeek: number;
  date: string;
  dateTimestamp: number;
}

export const WeekCardDailyGoals = ({
  weekNumber,
  quarterlyGoals,
}: WeekCardDailyGoalsProps) => {
  const {
    createDailyGoal,
    updateQuarterlyGoalTitle,
    deleteQuarterlyGoal,
    weekData,
  } = useDashboard();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Get the current week's data
  const currentWeekData = weekData.find(
    (week) => week.weekNumber === weekNumber
  );
  if (!currentWeekData) return null;

  // Collect all weekly goals and their parent quarterly goals
  const allWeeklyGoals = quarterlyGoals.flatMap((quarterlyGoal) =>
    quarterlyGoal.children.map((weeklyGoal) => ({
      weeklyGoal,
      quarterlyGoal,
    }))
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
        weekNumber,
        dayOfWeek,
        dateTimestamp,
      });
      // Clear the input after successful creation
      setNewGoalTitles((prev) => ({
        ...prev,
        [weeklyGoal._id]: '',
      }));
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    }
  };

  const handleUpdateDailyGoalTitle = async (
    goalId: Id<'goals'>,
    newTitle: string
  ) => {
    try {
      await updateQuarterlyGoalTitle({
        goalId,
        title: newTitle,
      });
    } catch (error) {
      console.error('Failed to update daily goal title:', error);
      throw error;
    }
  };

  const handleDeleteDailyGoal = async (goalId: Id<'goals'>) => {
    try {
      await deleteQuarterlyGoal({
        goalId,
      });
    } catch (error) {
      console.error('Failed to delete daily goal:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-2">
      {currentWeekData.days.map((day: DayData) => (
        <DaySection
          key={day.dayOfWeek}
          day={day}
          weeklyGoalsData={allWeeklyGoals}
          onCreateGoal={(weeklyGoal) =>
            handleCreateDailyGoal(
              weeklyGoal,
              day.dayOfWeek as DayOfWeek,
              day.dateTimestamp
            )
          }
          onUpdateGoalTitle={handleUpdateDailyGoalTitle}
          onDeleteGoal={handleDeleteDailyGoal}
          newGoalTitles={newGoalTitles}
          onNewGoalTitleChange={(weeklyGoalId, value) =>
            setNewGoalTitles((prev) => ({
              ...prev,
              [weeklyGoalId]: value,
            }))
          }
        />
      ))}
    </div>
  );
};
