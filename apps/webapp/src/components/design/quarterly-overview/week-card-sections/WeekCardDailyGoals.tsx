import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import {
  useState,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
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
import { Edit2, Plus, Star, Pin, X, History } from 'lucide-react';
import { DeleteGoalIconButton } from '../../goals-new/DeleteGoalIconButton';
import { GoalEditPopover } from '../../goals-new/GoalEditPopover';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DailyGoalsFocusMode } from './DailyGoalsFocusMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  showOnlyToday?: boolean;
  selectedDayOverride?: DayOfWeek;
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

export interface WeekCardDailyGoalsRef {
  openFocusMode: () => void;
}

export const WeekCardDailyGoals = forwardRef<
  WeekCardDailyGoalsRef,
  WeekCardDailyGoalsProps
>(({ weekNumber, showOnlyToday, selectedDayOverride }, ref) => {
  const { days, weeklyGoals } = useWeek();
  const { createDailyGoal } = useDashboard();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isPastDaysExpanded, setIsPastDaysExpanded] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => {
    const today = DateTime.now();
    const todayWeekNumber = today.weekNumber;
    const todayDayOfWeek = today.weekday as DayOfWeek;

    // If there's a selectedDayOverride, use that
    if (selectedDayOverride) {
      return selectedDayOverride;
    }

    // Check if we're in the current week
    const isCurrentWeek = weekNumber === todayWeekNumber;

    // If we're in the current week, select today's day
    if (isCurrentWeek) {
      return todayDayOfWeek;
    }

    // Otherwise, select Monday by default
    return DayOfWeek.MONDAY;
  });
  const [selectedWeeklyGoalId, setSelectedWeeklyGoalId] =
    useState<Id<'goals'>>();

  // Sort and categorize days
  const { currentDay, futureDays, pastDays } = useMemo(() => {
    const today = DateTime.now();
    const todayWeekNumber = today.weekNumber;
    const todayDayOfWeek = today.weekday;
    const sortedDays = [...(days as DayData[])];

    // If we have a selectedDayOverride and showOnlyToday is true, show that day as current
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

    // Find current day
    const currentDayData = sortedDays.find(
      (d) => weekNumber === todayWeekNumber && d.dayOfWeek === todayDayOfWeek
    );

    // Separate future and past days
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
  }, [days, weekNumber, selectedDayOverride, showOnlyToday]);

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
    if (!newGoalTitle.trim() || !selectedWeeklyGoalId) return;

    try {
      await createDailyGoal({
        title: newGoalTitle.trim(),
        parentId: selectedWeeklyGoalId,
        weekNumber,
        dayOfWeek: selectedDayOfWeek,
      });
      setNewGoalTitle('');
    } catch (error) {
      console.error('Failed to create daily goal:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    openFocusMode: () => setIsFocusMode(true),
  }));

  return (
    <div className="space-y-4">
      <Dialog open={isFocusMode} onOpenChange={setIsFocusMode}>
        <DialogPortal>
          <DailyGoalsFocusMode
            weekNumber={weekNumber}
            onClose={() => setIsFocusMode(false)}
          />
        </DialogPortal>
      </Dialog>

      {/* Past Days Collapsible Section - Always First */}
      {!showOnlyToday && pastDays.length > 0 && (
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
      )}
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
        {!showOnlyToday &&
          futureDays.map((day) => (
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
});

const DaySection = () => {
  const { createDailyGoal, updateQuarterlyGoalTitle, deleteQuarterlyGoal } =
    useDashboard();
  const { dayOfWeek, dateTimestamp, dailyGoalsView } = useDay();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Sort the weekly goals based on their quarterly goal's status and titles
  const sortedWeeklyGoals = useMemo(() => {
    return [...dailyGoalsView.weeklyGoals].sort((a, b) => {
      const aQuarterly = a.quarterlyGoal;
      const bQuarterly = b.quarterlyGoal;

      // First by starred status
      if (aQuarterly.state?.isStarred && !bQuarterly.state?.isStarred)
        return -1;
      if (!aQuarterly.state?.isStarred && bQuarterly.state?.isStarred) return 1;

      // Then by pinned status
      if (aQuarterly.state?.isPinned && !bQuarterly.state?.isPinned) return -1;
      if (!aQuarterly.state?.isPinned && bQuarterly.state?.isPinned) return 1;

      // Then by quarterly goal title
      const quarterlyTitleCompare = aQuarterly.title.localeCompare(
        bQuarterly.title
      );
      if (quarterlyTitleCompare !== 0) return quarterlyTitleCompare;

      // Finally by weekly goal title
      return a.weeklyGoal.title.localeCompare(b.weeklyGoal.title);
    });
  }, [dailyGoalsView.weeklyGoals]);

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
    <div className="space-y-2 mb-1 border-b border-gray-100 last:border-b-0">
      <DayHeader dayOfWeek={dayOfWeek} />
      <div>
        {sortedWeeklyGoals.map(({ weeklyGoal, quarterlyGoal }) => (
          <DailyGoalGroup
            key={weeklyGoal._id}
            weeklyGoal={{
              ...weeklyGoal,
              children: [...weeklyGoal.children].sort((a, b) =>
                a.title.localeCompare(b.title)
              ),
            }}
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
  const { toggleGoalCompletion, updateDailyGoalDay } = useDashboard();
  const { weekNumber } = useWeek();
  const isComplete = goal.state?.isComplete ?? false;
  const currentDayOfWeek = goal.state?.daily?.dayOfWeek;

  const handleMoveToDayOfWeek = async (newDayOfWeek: number) => {
    if (!currentDayOfWeek || newDayOfWeek === currentDayOfWeek) return;
    await updateDailyGoalDay({
      goalId: goal._id,
      weekNumber,
      newDayOfWeek,
    });
  };

  return (
    <div className="group px-2 py-1 hover:bg-gray-50/50 rounded-sm">
      <div className="text-sm flex items-center gap-2 group/title">
        <Checkbox
          checked={isComplete}
          onCheckedChange={(checked) =>
            toggleGoalCompletion({
              goalId: goal._id,
              weekNumber,
              isComplete: checked === true,
            })
          }
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
                <div className="flex items-center gap-2">
                  <Select
                    value={currentDayOfWeek?.toString()}
                    onValueChange={(value) =>
                      handleMoveToDayOfWeek(parseInt(value))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Move to day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DayOfWeek).map(([name, value]) => (
                        <SelectItem
                          key={value}
                          value={value.toString()}
                          disabled={value === currentDayOfWeek}
                        >
                          {name.charAt(0) + name.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
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
  const [isCreating, setIsCreating] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  // Calculate if all daily goals are complete
  const isSoftComplete =
    dailyGoals.length > 0 && dailyGoals.every((goal) => goal.state?.isComplete);

  const handleSubmit = () => {
    onCreateGoal();
    // Don't hide the input after submission to allow for multiple entries
  };

  const handleEscape = () => {
    setIsCreating(false);
    onNewGoalTitleChange(''); // Clear the input
  };

  const isStarred = quarterlyGoal.state?.isStarred ?? false;
  const isPinned = quarterlyGoal.state?.isPinned ?? false;

  return (
    <div>
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50' : ''
        )}
      >
        <div>
          <div className="flex items-center justify-between">
            {/* Weekly Goal Title with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent font-semibold text-gray-800 justify-start text-left focus-visible:ring-0"
                >
                  <span className="truncate">{weeklyGoal.title}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{weeklyGoal.title}</h3>
                    <GoalEditPopover
                      title={weeklyGoal.title}
                      details={weeklyGoal.details}
                      onSave={async (title, details) => {
                        await onUpdateGoalTitle(weeklyGoal._id, title, details);
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
                  {weeklyGoal.details && (
                    <SafeHTML
                      html={weeklyGoal.details}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            {isStarred && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            )}
            {isPinned && (
              <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
            )}
            {/* Quarterly Goal Title with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent text-gray-500 justify-start text-left focus-visible:ring-0"
                >
                  <span className="truncate">{quarterlyGoal.title}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{quarterlyGoal.title}</h3>
                    <GoalEditPopover
                      title={quarterlyGoal.title}
                      details={quarterlyGoal.details}
                      onSave={async (title, details) => {
                        await onUpdateGoalTitle(
                          quarterlyGoal._id,
                          title,
                          details
                        );
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
                  {quarterlyGoal.details && (
                    <SafeHTML
                      html={quarterlyGoal.details}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
          <div
            className="pt-1"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => !isCreating && setIsHovering(false)}
          >
            <div
              className={cn(
                'transition-opacity duration-150',
                isCreating || isHovering
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              )}
            >
              <CreateGoalInput
                placeholder="Add a task..."
                value={newGoalTitle}
                onChange={onNewGoalTitleChange}
                onSubmit={handleSubmit}
                onEscape={handleEscape}
                onFocus={() => setIsCreating(true)}
                onBlur={() => {
                  if (!newGoalTitle) {
                    setIsCreating(false);
                    setIsHovering(false);
                  }
                }}
                autoFocus={isCreating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple presentational component for the day header
const DayHeader = ({ dayOfWeek }: { dayOfWeek: number }) => {
  const { moveIncompleteTasksFromPreviousDay } = useDashboard();
  const { weekNumber } = useWeek();
  const [isMovingTasks, setIsMovingTasks] = useState(false);

  const handleMoveTasksFromPreviousDay = async () => {
    try {
      setIsMovingTasks(true);
      await moveIncompleteTasksFromPreviousDay({
        weekNumber,
        targetDayOfWeek: dayOfWeek,
      });
    } finally {
      setIsMovingTasks(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-gray-100 py-1 px-3 rounded-md">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="p-0 h-auto hover:bg-transparent font-bold text-gray-900 text-sm w-full cursor-pointer">
                {getDayName(dayOfWeek)}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleMoveTasksFromPreviousDay}
                disabled={isMovingTasks}
              >
                <History className="mr-2 h-4 w-4" />
                <div className="flex flex-col w-full items-center">
                  <span>Pull Incomplete</span>
                  <span className="text-gray-500 text-xs">
                    from previous day
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
