import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalActionMenu } from '@/components/molecules/goal-details/GoalActionMenu';
import { GoalDetailsChildrenList } from '@/components/molecules/goal-details/GoalDetailsChildrenList';
import {
  GoalEditProvider,
  useGoalEditContext,
} from '@/components/molecules/goal-details/GoalEditContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';
import {
  GoalChildrenSection,
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalHeader,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

export interface WeeklyGoalPopoverProps {
  /** The weekly goal to display */
  goal: GoalWithDetailsAndChildren;
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
 */
export function WeeklyGoalPopover({
  goal,
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
}: WeeklyGoalPopoverProps) {
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
      <WeeklyGoalPopoverContent
        goal={goal}
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
  goal,
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
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();

  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <>
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
        <FireGoalsProvider>
          <GoalHeader
            title={goal.title}
            isComplete={isComplete}
            onToggleComplete={onToggleComplete}
            actionMenu={<GoalActionMenu onSave={onSave} isQuarterlyGoal={false} />}
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
                    onValueChange={(value) =>
                      setSelectedDayOfWeek(Number.parseInt(value) as DayOfWeek)
                    }
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
      </GoalDetailsPopoverView>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
