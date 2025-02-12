import type {
  QuarterlyGoalBase,
  WeeklyGoalBase,
  TaskBase,
  QuarterlyGoalState,
  WeeklyGoalState,
  TaskState,
} from '.';

/**
 * View types combine the base types with their state properties for rendering
 */
export interface QuarterlyGoalView extends QuarterlyGoalBase {
  progress: number; // From QuarterlyGoalState
  isStarred: boolean; // From QuarterlyGoalState
  isPinned: boolean; // From QuarterlyGoalState
  weeklyGoals: WeeklyGoalView[]; // Nested view type
}

export interface WeeklyGoalView extends WeeklyGoalBase {
  isComplete: boolean; // From WeeklyGoalState
  isHardComplete: boolean; // From WeeklyGoalState
  tasks: TaskView[]; // Nested view type
}

export interface TaskView extends TaskBase {
  isComplete: boolean; // From TaskState
  date?: string; // From TaskState
}

/**
 * Utility functions to combine base and state into view types
 */
export function createQuarterlyGoalView(
  base: QuarterlyGoalBase,
  state: QuarterlyGoalState
): QuarterlyGoalView {
  return {
    ...base,
    progress: state.progress,
    isStarred: state.isStarred,
    isPinned: state.isPinned,
    weeklyGoals: base.weeklyGoals.map((weeklyGoal: WeeklyGoalBase) => {
      const weeklyState = state.weeklyGoalStates.find(
        (s: WeeklyGoalState) => s.id === weeklyGoal.id
      );
      if (!weeklyState) {
        return {
          ...weeklyGoal,
          isComplete: false,
          isHardComplete: false,
          tasks: weeklyGoal.tasks.map((task: TaskBase) => ({
            ...task,
            isComplete: false,
            date: '',
          })),
        };
      }
      return createWeeklyGoalView(weeklyGoal, weeklyState);
    }),
  };
}

export function createWeeklyGoalView(
  base: WeeklyGoalBase,
  state: WeeklyGoalState
): WeeklyGoalView {
  return {
    ...base,
    isComplete: state.isComplete,
    isHardComplete: state.isHardComplete,
    tasks: base.tasks.map((task: TaskBase) => {
      const taskState = state.taskStates.find(
        (s: TaskState) => s.id === task.id
      );
      if (!taskState) {
        return {
          ...task,
          isComplete: false,
          date: '',
        };
      }
      return createTaskView(task, taskState);
    }),
  };
}

export function createTaskView(base: TaskBase, state: TaskState): TaskView {
  return {
    ...base,
    isComplete: state.isComplete,
    date: state.date,
  };
}
