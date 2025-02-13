/**
 * Core types for the goals system
 */

// Core Entities
export interface Goal {
  id: string;
  title: string;
  path: string;
}
/**
 * Represents a weekly goal, which is a sub-goal of a quarterly goal
 */
export interface WeeklyGoalBase extends Goal {
  weekNumber: number; // 1-4 representing the week in the quarter
  tasks: TaskBase[];
}

/**
 * Represents a daily task, which is a sub-goal of a weekly goal
 */
export interface TaskBase extends Goal {
  date?: string;
}

// State Management Types

/**
 * Base interface for goal state tracking
 */
export interface GoalState {
  id: string; // ID of the goal this state belongs to
  isComplete: boolean;
}

/**
 * State tracking for weekly goals
 */
export interface WeeklyGoalState extends GoalState {
  isHardComplete: boolean;
  taskStates: TaskState[];
}

/**
 * State tracking for daily tasks
 */
export interface TaskState extends GoalState {
  date?: string;
}

// Edit State Type
export interface EditState {
  weekIndex: number;
  goalId: string;
  type: 'title' | 'progress';
  originalValue: string;
}

// Type aliases for semantic clarity
export type DailyGoalBase = TaskBase;
export type DailyGoalState = TaskState;
