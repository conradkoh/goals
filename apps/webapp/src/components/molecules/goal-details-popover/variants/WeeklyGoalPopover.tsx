import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';

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

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
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
        <WeeklyGoalPopoverContentInner
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

/**
 * Internal props for the weekly goal content component.
 */
interface WeeklyGoalPopoverContentInnerProps extends WeeklyGoalPopoverProps {
  /** Whether the goal is marked as complete */
  isComplete: boolean;
  /** Current value of the new daily goal input */
  newDailyGoalTitle: string;
  /** Setter for the new daily goal input value */
  setNewDailyGoalTitle: (title: string) => void;
  /** Currently selected day of week for new goal */
  selectedDayOfWeek: DayOfWeek;
  /** Setter for the selected day of week */
  setSelectedDayOfWeek: (day: DayOfWeek) => void;
  /** Handler for creating a new daily goal */
  handleCreateDailyGoal: () => Promise<void>;
}

/**
 * Internal content component for weekly goal popover.
 * Separated to access contexts provided by parent.
 */
function WeeklyGoalPopoverContentInner({
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
}: WeeklyGoalPopoverContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();

  const hasChildren = goal.children && goal.children.length > 0;

  // Handler for updating goal details when task list items are toggled
  const handleDetailsChange = (newDetails: string) => {
    onSave(goal.title, newDetails, goal.dueDate);
  };

  // Shared content for both popover and fullscreen modes
  const goalContent = (
    <FireGoalsProvider>
      <GoalHeader
        title={goal.title}
        isComplete={isComplete}
        onToggleComplete={onToggleComplete}
        statusControls={<GoalStatusIcons goalId={goal._id} />}
        actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={false} />}
      />

      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

      {goal.details && (
        <GoalDetailsSection
          title={goal.title}
          details={goal.details}
          onDetailsChange={handleDetailsChange}
        />
      )}

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
