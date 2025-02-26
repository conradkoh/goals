import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SafeHTML } from '@/components/ui/safe-html';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { DayProvider, useDay } from '@/hooks/useDay';
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, History, Pin, Star, Check } from 'lucide-react';
import { DateTime } from 'luxon';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { DailyGoalItem } from '../../goals-new/DailyGoalItem';
import { GoalEditPopover } from '../../goals-new/GoalEditPopover';
import { GoalSelector } from '../../goals-new/GoalSelector';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { DailyGoalListContainer } from '../../goals-new/DailyGoalListContainer';

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
  const { days, weeklyGoals, createDailyGoalOptimistic, dailyGoals } =
    useWeek();
  const currentDateTime = useCurrentDateTime();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isPastDaysExpanded, setIsPastDaysExpanded] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => {
    const todayWeekNumber = currentDateTime.weekNumber;
    const todayDayOfWeek = currentDateTime.weekday as DayOfWeek;

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
  const [isCreating, setIsCreating] = useState(false);
  const [previousTitle, setPreviousTitle] = useState('');

  // Sort and categorize days
  const { currentDay, futureDays, pastDays } = useMemo(() => {
    const todayWeekNumber = currentDateTime.weekNumber;
    const todayDayOfWeek = currentDateTime.weekday as DayOfWeekType;
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
    // If there are no past days, return zeros
    if (!pastDays || pastDays.length === 0) {
      return { totalTasks: 0, completedTasks: 0 };
    }

    // Always calculate based on past days only
    let totalTasks = 0;
    let completedTasks = 0;

    // Get past days of week numbers
    const pastDayNumbers = pastDays.map((day) => day.dayOfWeek);

    // Find daily goals for past days only
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
      // Store previous value for error recovery
      setPreviousTitle(newGoalTitle);
      // Clear input immediately for better UX
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
        newGoalTitle.trim(),
        selectedDayOfWeek,
        dateTimestamp
      );
    } catch (error) {
      console.error('Failed to create daily goal:', error);
      // Restore previous value on error
      setNewGoalTitle(previousTitle);
      toast({
        variant: 'destructive',
        title: 'Failed to create goal',
        description: 'There was an error creating your goal. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Implement the openFocusMode ref method
  useImperativeHandle(ref, () => ({
    openFocusMode: () => {
      // This is now a no-op since we're using direct navigation
    },
  }));

  return (
    <div className="space-y-4">
      {/* Past Days Collapsible Section - Always First */}
      {!showOnlyToday && pastDays.length > 0 && (
        <CollapsibleMinimal
          open={isPastDaysExpanded}
          onOpenChange={setIsPastDaysExpanded}
        >
          <CollapsibleMinimalTrigger>
            <div className="flex justify-between w-full items-center">
              <span className="font-medium">Past Days</span>
              <div className="flex items-center text-gray-600 text-sm whitespace-nowrap ml-2">
                <Check className="w-3.5 h-3.5 mr-1 text-gray-400" />
                <span>
                  {pastDaysSummary.completedTasks}/{pastDaysSummary.totalTasks}
                </span>
              </div>
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
WeekCardDailyGoals.displayName = 'WeekCardDailyGoals';

const DaySection = () => {
  const { createDailyGoalOptimistic, deleteDailyGoalOptimistic } = useWeek();
  const { updateQuarterlyGoalTitle } = useGoalActions();
  const { dayOfWeek, dateTimestamp, dailyGoalsView } = useDay();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );
  const [isCreating, setIsCreating] = useState<Record<string, boolean>>({});
  const [previousTitles, setPreviousTitles] = useState<Record<string, string>>(
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

      // Store previous value for error recovery
      setPreviousTitles((prev) => ({
        ...prev,
        [weeklyGoal._id]: title,
      }));
      // Clear input immediately for better UX
      setNewGoalTitles((prev) => ({
        ...prev,
        [weeklyGoal._id]: '',
      }));
      setIsCreating((prev) => ({
        ...prev,
        [weeklyGoal._id]: true,
      }));

      await createDailyGoalOptimistic(
        weeklyGoal._id,
        title.trim(),
        dayOfWeek,
        dateTimestamp
      );
    } catch (error) {
      console.error('Failed to create daily goal:', error);
      // Restore previous value on error
      setNewGoalTitles((prev) => ({
        ...prev,
        [weeklyGoal._id]: previousTitles[weeklyGoal._id] || '',
      }));
      toast({
        variant: 'destructive',
        title: 'Failed to create goal',
        description: 'There was an error creating your goal. Please try again.',
      });
    } finally {
      setIsCreating((prev) => ({
        ...prev,
        [weeklyGoal._id]: false,
      }));
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
    await deleteDailyGoalOptimistic(goalId);
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
              handleCreateDailyGoal(weeklyGoal, dayOfWeek, dateTimestamp)
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
            isCreating={isCreating[weeklyGoal._id] || false}
          />
        ))}
      </div>
    </div>
  );
};

export interface CreateGoalInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onEscape?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface GoalSelectorProps {
  goals: GoalWithDetailsAndChildren[];
  value: Id<'goals'> | undefined;
  onChange: (value: Id<'goals'> | undefined) => void;
  placeholder: string;
  emptyStateMessage: string;
  disabled?: boolean;
}

interface DailyGoalGroupProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: DayOfWeekType;
  onCreateGoal: () => void;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  newGoalTitle: string;
  onNewGoalTitleChange: (value: string) => void;
  isCreating: boolean;
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
  isCreating,
}: DailyGoalGroupProps) => {
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  // Calculate if all daily goals are complete
  const isSoftComplete =
    dailyGoals.length > 0 && dailyGoals.every((goal) => goal.state?.isComplete);

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
                  className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
                >
                  <span className="break-words w-full whitespace-pre-wrap">
                    {weeklyGoal.title}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold break-words flex-1 mr-2">
                      {weeklyGoal.title}
                    </h3>
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
                  className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
                >
                  <span className="break-words w-full whitespace-pre-wrap">
                    {quarterlyGoal.title}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold break-words flex-1 mr-2">
                      {quarterlyGoal.title}
                    </h3>
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
        <DailyGoalListContainer
          goals={dailyGoals}
          onUpdateGoalTitle={onUpdateGoalTitle}
          onDeleteGoal={onDeleteGoal}
          onCreateGoal={async (title) => {
            onNewGoalTitleChange(title);
            await onCreateGoal();
          }}
          createInputPlaceholder="Add a task..."
          isCreating={isCreating}
        />
      </div>
    </div>
  );
};

interface PreviewTask {
  id: string;
  title: string;
  details?: string;
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoal: {
    id: string;
    title: string;
  };
}

const DayHeader = ({ dayOfWeek }: { dayOfWeek: DayOfWeek }) => {
  const { moveGoalsFromDay } = useGoalActions();
  const { weekNumber } = useWeek();
  const { dateTimestamp } = useDay();
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    previousDay: string;
    targetDay: string;
    tasks: Array<PreviewTask>;
  } | null>(null);
  const isMonday = dayOfWeek === DayOfWeek.MONDAY;
  const isDisabled = isMovingTasks || isMonday;

  // Get previous day of week
  const getPreviousDayOfWeek = (currentDay: DayOfWeek): DayOfWeek => {
    switch (currentDay) {
      case DayOfWeek.TUESDAY:
        return DayOfWeek.MONDAY;
      case DayOfWeek.WEDNESDAY:
        return DayOfWeek.TUESDAY;
      case DayOfWeek.THURSDAY:
        return DayOfWeek.WEDNESDAY;
      case DayOfWeek.FRIDAY:
        return DayOfWeek.THURSDAY;
      case DayOfWeek.SATURDAY:
        return DayOfWeek.FRIDAY;
      case DayOfWeek.SUNDAY:
        return DayOfWeek.SATURDAY;
      default:
        return DayOfWeek.SUNDAY; // This shouldn't happen for Monday
    }
  };

  // Format the date string
  const formattedDate = useMemo(() => {
    if (!dateTimestamp) return '';
    return DateTime.fromMillis(dateTimestamp).toFormat('MMM d');
  }, [dateTimestamp]);

  const handlePreviewTasks = async () => {
    if (isMonday) return;
    try {
      const year = DateTime.fromMillis(dateTimestamp).year;
      const quarter = Math.ceil(DateTime.fromMillis(dateTimestamp).month / 3);
      const previousDayOfWeek = getPreviousDayOfWeek(dayOfWeek);

      // Use the new moveGoalsFromDay function
      const previewData = await moveGoalsFromDay({
        from: {
          year,
          quarter,
          weekNumber,
          dayOfWeek: previousDayOfWeek,
        },
        to: {
          year,
          quarter,
          weekNumber,
          dayOfWeek,
        },
        dryRun: true,
        moveOnlyIncomplete: true,
      });

      // Check if we have preview data
      if ('canMove' in previewData && previewData.canMove) {
        setPreview({
          previousDay: previewData.sourceDay.name,
          targetDay: previewData.targetDay.name,
          tasks: previewData.tasks,
        });
        setShowConfirmDialog(true);
      } else if (!('canMove' in previewData) || !previewData.canMove) {
        toast({
          title: 'Cannot move tasks',
          description: 'No incomplete tasks to move',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to preview tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview tasks to move.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveTasksFromPreviousDay = async () => {
    if (isMonday) return;
    try {
      setIsMovingTasks(true);
      const year = DateTime.fromMillis(dateTimestamp).year;
      const quarter = Math.ceil(DateTime.fromMillis(dateTimestamp).month / 3);
      const previousDayOfWeek = getPreviousDayOfWeek(dayOfWeek);

      // Use the new moveGoalsFromDay function for the actual move operation
      await moveGoalsFromDay({
        from: {
          year,
          quarter,
          weekNumber,
          dayOfWeek: previousDayOfWeek,
        },
        to: {
          year,
          quarter,
          weekNumber,
          dayOfWeek,
        },
        dryRun: false,
        moveOnlyIncomplete: true,
      });

      setShowConfirmDialog(false);
      toast({
        title: 'Tasks moved',
        description: `Moved incomplete tasks from ${getDayName(
          previousDayOfWeek
        )} to ${getDayName(dayOfWeek)}.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to move tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to move tasks.',
        variant: 'destructive',
      });
    } finally {
      setIsMovingTasks(false);
    }
  };

  const getTooltipContent = () => {
    if (isMonday) {
      return 'Cannot pull tasks to Monday as it is the first day of the week';
    }
    if (isMovingTasks) {
      return 'Moving tasks...';
    }
    return null;
  };

  const tooltipContent = getTooltipContent();

  // Group tasks by quarterly and weekly goals
  const groupedTasks = useMemo(() => {
    if (!preview?.tasks) return [];

    const grouped = preview.tasks.reduce(
      (acc, task) => {
        const quarterlyId = task.quarterlyGoal.id;
        const weeklyId = task.weeklyGoal.id;

        if (!acc[quarterlyId]) {
          acc[quarterlyId] = {
            quarterlyGoal: task.quarterlyGoal,
            weeklyGoals: {},
          };
        }

        if (!acc[quarterlyId].weeklyGoals[weeklyId]) {
          acc[quarterlyId].weeklyGoals[weeklyId] = {
            weeklyGoal: task.weeklyGoal,
            tasks: [],
          };
        }

        acc[quarterlyId].weeklyGoals[weeklyId].tasks.push(task);
        return acc;
      },
      {} as Record<
        string,
        {
          quarterlyGoal: {
            id: string;
            title: string;
            isStarred?: boolean;
            isPinned?: boolean;
          };
          weeklyGoals: Record<
            string,
            {
              weeklyGoal: { id: string; title: string };
              tasks: Array<PreviewTask>;
            }
          >;
        }
      >
    );

    return Object.values(grouped);
  }, [preview?.tasks]);

  return (
    <>
      <div className="space-y-2">
        <div className="bg-gray-100 py-1 px-3 rounded-md">
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="p-0 h-auto hover:bg-transparent font-bold text-gray-900 text-sm w-full cursor-pointer flex items-center gap-2">
                  <span>{getDayName(dayOfWeek)}</span>
                  <span className="text-gray-500 font-normal">
                    {formattedDate}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDisabled ? (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full cursor-not-allowed">
                          <DropdownMenuItem
                            className="cursor-not-allowed opacity-50"
                            disabled
                          >
                            <History className="mr-2 h-4 w-4" />
                            <div className="flex flex-col w-full items-center">
                              <span>Pull Incomplete</span>
                              <span className="text-gray-500 text-xs">
                                from previous day
                              </span>
                            </div>
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tooltipContent}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handlePreviewTasks}
                  >
                    <History className="mr-2 h-4 w-4" />
                    <div className="flex flex-col w-full items-center">
                      <span>Pull Incomplete</span>
                      <span className="text-gray-500 text-xs">
                        from previous day
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Tasks from Previous Day</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {preview?.tasks.length === 0
                    ? `There are no incomplete tasks from ${preview?.previousDay} to move to ${preview?.targetDay}.`
                    : `The following incomplete tasks from ${preview?.previousDay} will be moved to ${preview?.targetDay}. Note that tasks will be moved, not copied.`}
                </p>
                {preview?.tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>All tasks from the previous day are complete!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedTasks.map((quarterlyGroup) => (
                      <div
                        key={quarterlyGroup.quarterlyGoal.id}
                        className="space-y-2"
                      >
                        <h4 className="font-medium text-sm flex items-center gap-1.5">
                          {quarterlyGroup.quarterlyGoal.isStarred && (
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          )}
                          {quarterlyGroup.quarterlyGoal.isPinned && (
                            <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                          )}
                          <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                            {quarterlyGroup.quarterlyGoal.title}
                          </div>
                        </h4>
                        <div
                          className={cn(
                            'rounded-md overflow-hidden',
                            quarterlyGroup.quarterlyGoal.isStarred
                              ? 'bg-yellow-50 border border-yellow-200'
                              : quarterlyGroup.quarterlyGoal.isPinned
                              ? 'bg-blue-50 border border-blue-200'
                              : ''
                          )}
                        >
                          {Object.values(quarterlyGroup.weeklyGoals).map(
                            (weeklyGroup) => (
                              <div
                                key={weeklyGroup.weeklyGoal.id}
                                className="pl-4 space-y-1 py-2"
                              >
                                <h5 className="text-sm text-muted-foreground">
                                  <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                                    {weeklyGroup.weeklyGoal.title}
                                  </div>
                                </h5>
                                <ul className="space-y-1">
                                  {weeklyGroup.tasks.map((task) => (
                                    <li
                                      key={task.id}
                                      className="flex items-center gap-2 pl-4"
                                    >
                                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                                      <div className="text-sm break-words">
                                        {task.title}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {preview && preview.tasks.length > 0 && (
              <AlertDialogAction onClick={handleMoveTasksFromPreviousDay}>
                Move Tasks
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
