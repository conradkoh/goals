import { Id, Doc } from '../../../convex/_generated/dataModel';
// Enum representing the depth of goals
export enum GoalDepth {
  Quarterly = 0, // Represents quarterly goals
  Weekly = 1, // Represents weekly goals
  Daily = 2, // Represents daily goals
}

// Type representing the carry-over information for goals
export type CarryOver = {
  type: 'week'; // Type of carry-over, currently only supports 'week'
  numWeeks: number; // Number of weeks to carry over
  fromGoal: Id<'goals'>; // ID of the goal from which to carry over
};

// Type representing a weekly goal that needs to be copied
export type WeeklyGoalToCopy = {
  originalGoal: Doc<'goals'>; // The original goal document
  weeklyState: Doc<'goalsWeekly'>; // The weekly state document of the goal
  carryOver: CarryOver; // Carry-over information for the goal
  quarterlyGoalId?: Id<'goals'>; // Link to parent quarterly goal, can be null
  dailyGoalsToMove: DailyGoalToMove[]; // Daily goals that need to be moved with this weekly goal
};

// Type representing a daily goal that needs to be moved
export type DailyGoalToMove = {
  goal: Doc<'goals'>; // The goal document to be moved
  weeklyState: Doc<'goalsWeekly'>; // The weekly state document of the goal
  parentWeeklyGoal: Doc<'goals'>; // The parent weekly goal document
  parentQuarterlyGoal?: Doc<'goals'>; // Added: Link to parent quarterly goal, can be null
};

// Type representing a quarterly goal that needs to be updated
export type QuarterlyGoalToUpdate = {
  goalId: Id<'goals'>; // ID of the goal to be updated
  isStarred: boolean; // Indicates if the goal is starred
  isPinned: boolean; // Indicates if the goal is pinned
};

// Type representing the result of processing goals
export type ProcessGoalResult = {
  weeklyGoalsToCopy: WeeklyGoalToCopy[]; // Array of weekly goals to copy
  dailyGoalsToMove: DailyGoalToMove[]; // Array of daily goals to move
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[]; // Array of quarterly goals to update
};
