'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { ListTodo, Loader2 } from 'lucide-react';

import { FocusedAddTaskRow } from './FocusedAddTaskRow';
import { FocusedGoalItemsList } from './FocusedGoalItemsList';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedAdhocGoalsSectionProps {
  goals: FocusedGoalItem[] | undefined;
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  addTaskValue?: string;
  onAddTaskChange?: (value: string) => void;
  onAddTaskSubmit?: () => void;
  isAddingTask?: boolean;
}

// fallow-ignore-next-line complexity
export function FocusedAdhocGoalsSection({
  goals,
  onToggleComplete,
  addTaskValue,
  onAddTaskChange,
  onAddTaskSubmit,
  isAddingTask = false,
}: FocusedAdhocGoalsSectionProps) {
  const showAddTask =
    addTaskValue !== undefined && onAddTaskChange !== undefined && onAddTaskSubmit !== undefined;

  return (
    <FocusedGoalSection
      title="Tasks"
      icon={<ListTodo className="h-3.5 w-3.5 text-muted-foreground" />}
    >
      <div className="px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {goals === undefined ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {goals.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                No tasks for today. Add one below to capture a quick action.
              </p>
            )}
            <FocusedGoalItemsList
              goals={goals}
              onToggleComplete={onToggleComplete}
              footer={
                showAddTask ? (
                  <FocusedAddTaskRow
                    value={addTaskValue}
                    onChange={onAddTaskChange}
                    onSubmit={onAddTaskSubmit}
                    disabled={isAddingTask}
                  />
                ) : undefined
              }
            />
          </>
        )}
      </div>
    </FocusedGoalSection>
  );
}
