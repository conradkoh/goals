// Base structure of a quarterly goal (the unchanging parts)
export interface QuarterlyGoalBase {
  id: string;
  title: string;
  path: string;
  quarter: 1 | 2 | 3 | 4;
  weeklyGoals: WeeklyGoalBase[];
}

// Base structure of a weekly goal
export interface WeeklyGoalBase {
  id: string;
  title: string;
  path: string;
  tasks: TaskBase[];
  isComplete?: boolean;
  isHardComplete?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
}

// Base structure of a task
export interface TaskBase {
  id: string;
  title: string;
  path: string;
  isComplete?: boolean;
  date?: string;
}

// Weekly state for a quarterly goal
export interface QuarterlyGoalWeekState {
  goalId: string;
  weekNumber: number;
  progress: number;
  isStarred: boolean;
  isPinned: boolean;
  weeklyGoalStates: WeeklyGoalState[];
}

// State for weekly goals in a specific week
export interface WeeklyGoalState {
  goalId: string;
  isComplete: boolean;
  isHardComplete: boolean;
  taskStates: TaskState[];
}

// State for tasks in a specific week
export interface TaskState {
  taskId: string;
  isComplete: boolean;
  date: string;
}

// Edit state type for handling goal edits
export interface EditState {
  weekIndex: number;
  goalId: string;
  type: 'title' | 'progress';
  originalValue: string;
}

/**
 * Creates an initial week state for a quarterly goal
 * This ensures consistent initialization of week states across the application
 */
export function createInitialWeekState(
  goalBase: QuarterlyGoalBase,
  weekNumber: number
): QuarterlyGoalWeekState {
  return {
    goalId: goalBase.id,
    weekNumber,
    progress: 0,
    isStarred: false,
    isPinned: false,
    weeklyGoalStates: goalBase.weeklyGoals.map((weeklyGoal) => ({
      goalId: weeklyGoal.id,
      isComplete: false,
      isHardComplete: false,
      taskStates: weeklyGoal.tasks.map((task) => ({
        taskId: task.id,
        isComplete: false,
        date: '',
      })),
    })),
  };
}
