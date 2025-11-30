import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  GoalActionMenuNew,
  GoalChildrenSection,
  GoalCompletionDate,
  GoalDetailsChildrenList,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  useGoalDisplayContext,
  useGoalEditContext,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

export interface WeeklyGoalPopoverProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
  /** Additional class names for the trigger button */
  triggerClassName?: string;
  /** Additional class names for the title text */
  titleClassName?: string;
}

/**
 * Weekly goal popover variant.
 * Shows daily goals children and ability to create daily goals with day selection.
 * Supports both popover and fullscreen display modes.
 *
 * Must be used within a GoalProvider context.
 */
export function WeeklyGoalPopover({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
}: WeeklyGoalPopoverProps) {
  const { goal } = useGoalContext();
  const { weekNumber, year, createDailyGoalOptimistic } = useWeek();

  // Memoize the current weekday to avoid re-renders from minute timer updates
  const currentWeekday = useMemo(() => {
    return DateTime.now().weekday as DayOfWeek;
  }, []);

  const [newDailyGoalTitle, setNewDailyGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => currentWeekday);

  const isComplete = goal.isComplete;

  const handleCreateDailyGoal = async () => {
    const trimmedTitle = newDailyGoalTitle.trim();
    if (trimmedTitle) {
      try {
        setNewDailyGoalTitle('');

        const dateTimestamp = DateTime.fromObject({
          weekNumber,
          weekYear: year,
        })
          .startOf('week')
          .plus({ days: selectedDayOfWeek - 1 })
          .toMillis();

        await createDailyGoalOptimistic(goal._id, trimmedTitle, selectedDayOfWeek, dateTimestamp);
      } catch (error) {
        console.error('Failed to create daily goal:', error);
        setNewDailyGoalTitle(trimmedTitle);
      }
    }
  };

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <WeeklyGoalPopoverContent
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          newDailyGoalTitle={newDailyGoalTitle}
          setNewDailyGoalTitle={setNewDailyGoalTitle}
          selectedDayOfWeek={selectedDayOfWeek}
          setSelectedDayOfWeek={setSelectedDayOfWeek}
          handleCreateDailyGoal={handleCreateDailyGoal}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

interface WeeklyGoalPopoverContentProps extends WeeklyGoalPopoverProps {
  isComplete: boolean;
  newDailyGoalTitle: string;
  setNewDailyGoalTitle: (title: string) => void;
  selectedDayOfWeek: DayOfWeek;
  setSelectedDayOfWeek: (day: DayOfWeek) => void;
  handleCreateDailyGoal: () => Promise<void>;
}

function WeeklyGoalPopoverContent({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  newDailyGoalTitle,
  setNewDailyGoalTitle,
  selectedDayOfWeek,
  setSelectedDayOfWeek,
  handleCreateDailyGoal,
}: WeeklyGoalPopoverContentProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();

  const hasChildren = goal.children && goal.children.length > 0;

  // Shared content for both popover and fullscreen modes
  const goalContent = (
    <FireGoalsProvider>
      <GoalHeader
        title={goal.title}
        isComplete={isComplete}
        onToggleComplete={onToggleComplete}
        actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={false} />}
      />

      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

      {goal.details && <GoalDetailsSection title={goal.title} details={goal.details} />}

      <GoalChildrenSection
        title="Daily Goals"
        childrenList={
          hasChildren ? (
            <GoalDetailsChildrenList parentGoal={goal} title="Daily Goals" />
          ) : undefined
        }
        createInput={
          <CreateGoalInput
            placeholder="Add a new daily goal..."
            value={newDailyGoalTitle}
            onChange={setNewDailyGoalTitle}
            onSubmit={handleCreateDailyGoal}
            onEscape={() => setNewDailyGoalTitle('')}
          >
            <div className="mt-2">
              <Select
                value={selectedDayOfWeek.toString()}
                onValueChange={(value) => setSelectedDayOfWeek(Number.parseInt(value) as DayOfWeek)}
              >
                <SelectTrigger className="h-9 text-xs">
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
          </CreateGoalInput>
        }
      />
    </FireGoalsProvider>
  );

  return (
    <>
      {/* Popover mode */}
      <GoalDetailsPopoverView
        popoverKey={goal._id.toString()}
        trigger={
          <GoalPopoverTrigger
            title={goal.title}
            className={triggerClassName}
            titleClassName={titleClassName}
          />
        }
      >
        {goalContent}
      </GoalDetailsPopoverView>

      {/* Fullscreen mode */}
      <GoalDetailsPopoverView
        popoverKey={`${goal._id.toString()}-fullscreen`}
        trigger={<span />}
        fullScreen
        open={isFullScreenOpen}
        onOpenChange={(open) => !open && closeFullScreen()}
      >
        {goalContent}
      </GoalDetailsPopoverView>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
