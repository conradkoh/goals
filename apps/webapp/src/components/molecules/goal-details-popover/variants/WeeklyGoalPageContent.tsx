/**
 * Weekly Goal Page Content
 *
 * Renders weekly goal content for use in the full page goal view.
 * Similar to WeeklyGoalPopover but without the popover/trigger wrapper.
 *
 * @module
 */

import { api } from '@workspace/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { DateTime } from 'luxon';
import { useMemo, useState, useCallback } from 'react';

import {
  GoalActionMenuNew,
  GoalChildrenSection,
  GoalCompletionDate,
  GoalDetailsChildrenList,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalEditModal,
  GoalEditProvider,
  GoalDueDateDisplay,
  GoalHeader,
  useGoalEditContext,
} from '../view/components';

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
import { useGoalActions } from '@/hooks/useGoalActions';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the WeeklyGoalPageContent component.
 *
 * @public
 */
export interface WeeklyGoalPageContentProps {
  /** Callback fired when the goal is marked as complete */
  onComplete?: () => void;
}

/**
 * Full weekly goal content with all interactive features.
 * Provides complete goal management including editing, completion,
 * and child daily goal operations.
 *
 * Must be used within GoalProvider and WeekProvider contexts.
 *
 * @public
 * @param props - Component props
 * @returns Rendered weekly goal content
 */
export function WeeklyGoalPageContent({ onComplete }: WeeklyGoalPageContentProps) {
  const { goal } = useGoalContext();
  const { weekNumber, year, createDailyGoalOptimistic } = useWeek();
  const { toggleGoalCompletion } = useGoalActions();
  const { sessionId } = useSession();
  const updateGoalTitleMutation = useMutation(api.dashboard.updateGoalTitle);

  // Memoize the current weekday to avoid re-renders
  const currentWeekday = useMemo(() => {
    return DateTime.now().weekday as DayOfWeek;
  }, []);

  const [newDailyGoalTitle, setNewDailyGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(() => currentWeekday);

  const isComplete = goal.isComplete;
  const hasChildren = goal.children && goal.children.length > 0;

  const handleSave = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      if (!sessionId) return;
      await updateGoalTitleMutation({
        sessionId,
        goalId: goal._id,
        title,
        details,
        dueDate,
      });
    },
    [goal._id, sessionId, updateGoalTitleMutation]
  );

  const handleToggleComplete = useCallback(async () => {
    await toggleGoalCompletion({
      goalId: goal._id,
      weekNumber,
      isComplete: !isComplete,
    });
    if (!isComplete && onComplete) {
      onComplete();
    }
  }, [goal._id, weekNumber, isComplete, toggleGoalCompletion, onComplete]);

  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      handleSave(goal.title, newDetails, goal.dueDate);
    },
    [goal.title, goal.dueDate, handleSave]
  );

  const handleCreateDailyGoal = useCallback(async () => {
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
  }, [newDailyGoalTitle, weekNumber, year, selectedDayOfWeek, goal._id, createDailyGoalOptimistic]);

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <WeeklyGoalPageContentInner
          isComplete={isComplete}
          hasChildren={hasChildren}
          onSave={handleSave}
          onToggleComplete={handleToggleComplete}
          onDetailsChange={handleDetailsChange}
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
 * Props passed to the inner content component.
 *
 * @internal
 */
interface WeeklyGoalPageContentInnerProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
  /** Whether the goal has child daily goals */
  hasChildren: boolean;
  /** Handler for saving goal updates */
  onSave: (title: string, details?: string, dueDate?: number) => Promise<void>;
  /** Handler for toggling goal completion */
  onToggleComplete: () => Promise<void>;
  /** Handler for updating goal details content */
  onDetailsChange: (newDetails: string) => void;
  /** Current value of the new daily goal input */
  newDailyGoalTitle: string;
  /** Setter for the new daily goal input */
  setNewDailyGoalTitle: (title: string) => void;
  /** Currently selected day of week for new goal */
  selectedDayOfWeek: DayOfWeek;
  /** Setter for the selected day of week */
  setSelectedDayOfWeek: (day: DayOfWeek) => void;
  /** Handler for creating a new daily goal */
  handleCreateDailyGoal: () => Promise<void>;
}

/**
 * Inner content component that renders the actual goal UI.
 * Separated to access GoalEditProvider context.
 *
 * @internal
 */
function WeeklyGoalPageContentInner({
  isComplete,
  hasChildren,
  onSave,
  onToggleComplete,
  onDetailsChange,
  newDailyGoalTitle,
  setNewDailyGoalTitle,
  selectedDayOfWeek,
  setSelectedDayOfWeek,
  handleCreateDailyGoal,
}: WeeklyGoalPageContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();

  return (
    <>
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
            onDetailsChange={onDetailsChange}
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

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
