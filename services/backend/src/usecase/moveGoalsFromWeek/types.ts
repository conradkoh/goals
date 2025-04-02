import { Id, Doc } from '../../../convex/_generated/dataModel';
import { DayOfWeek } from '../../../src/constants';

// Core domain types
export enum GoalDepth {
  Quarterly = 0,
  Weekly = 1,
  Daily = 2,
}

export type CarryOver = {
  type: 'week';
  numWeeks: number;
  fromGoal: {
    previousGoalId: Id<'goals'>;
    rootGoalId: Id<'goals'>;
  };
};

// Input types
export type TimePeriod = {
  year: number;
  quarter: number;
  weekNumber: number;
  dayOfWeek?: DayOfWeek;
};

export type MoveGoalsFromWeekArgs = {
  userId: Id<'users'>;
  from: TimePeriod;
  to: TimePeriod;
  dryRun: boolean;
};

// Internal processing types
export type WeeklyGoalWithState = {
  goal: Doc<'goals'>;
  state: Doc<'goalStateByWeek'>;
  dailyGoals: DailyGoalToMove[];
};

export type TargetWeekContext = {
  userId: Id<'users'>;
  year: number;
  quarter: number;
  weekNumber: number;
  dayOfWeek?: DayOfWeek;
  existingGoals: Doc<'goalStateByWeek'>[];
};

export type DailyGoalToMove = {
  goal: Doc<'goals'>;
  weekState: Doc<'goalStateByWeek'>;
  parentWeeklyGoal: Doc<'goals'>;
  parentQuarterlyGoal?: Doc<'goals'>;
};

export type QuarterlyGoalToUpdate = {
  goalId: Id<'goals'>;
  title: string;
  isStarred: boolean;
  isPinned: boolean;
};

// Result types
export type ProcessGoalResult = {
  weekStatesToCopy: WeekStateToCopy[];
  dailyGoalsToMove: DailyGoalToMove[];
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[];
};

export type WeekStateToCopy = {
  originalGoal: Doc<'goals'>;
  weekState: Doc<'goalStateByWeek'>;
  carryOver: CarryOver;
  quarterlyGoalId?: Id<'goals'>;
  dailyGoalsToMove: DailyGoalToMove[];
};

// Summary types used in API responses
export type GoalSummary = {
  id: Id<'goals'>;
  title: string;
};

export type WeekStateSummary = {
  title: string;
  carryOver: CarryOver;
  dailyGoalsCount: number;
  quarterlyGoalId?: Id<'goals'>;
};

export type DailyGoalSummary = {
  id: Id<'goals'>;
  title: string;
  weeklyGoalId: Id<'goals'>;
  weeklyGoalTitle: string;
  quarterlyGoalId?: Id<'goals'>;
  quarterlyGoalTitle?: string;
};

export type QuarterlyGoalSummary = {
  id: Id<'goals'>;
  title: string;
  isStarred: boolean;
  isPinned: boolean;
};

export type BaseGoalMoveResult = {
  weekStatesToCopy: WeekStateSummary[];
  dailyGoalsToMove: DailyGoalSummary[];
  quarterlyGoalsToUpdate: QuarterlyGoalSummary[];
};

export type DryRunResult = BaseGoalMoveResult & {
  isDryRun: true;
  canPull: true;
};

export type UpdateResult = BaseGoalMoveResult & {
  weekStatesCopied: number;
  dailyGoalsMoved: number;
  quarterlyGoalsUpdated: number;
};

export type MoveGoalsFromWeekResult<T extends MoveGoalsFromWeekArgs> =
  T['dryRun'] extends true ? DryRunResult : UpdateResult;
