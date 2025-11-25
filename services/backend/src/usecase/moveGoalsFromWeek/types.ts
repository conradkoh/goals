import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { DayOfWeek } from '../../../src/constants';

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

export type AdhocGoalToMove = {
  goal: Doc<'goals'>;
  domain?: Doc<'domains'>;
};

// Result types
export type ProcessGoalResult = {
  weekStatesToCopy: WeekStateToCopy[];
  dailyGoalsToMove: DailyGoalToMove[];
  quarterlyGoalsToUpdate: QuarterlyGoalToUpdate[];
  adhocGoalsToMove: AdhocGoalToMove[];
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

export type AdhocGoalSummary = {
  id: Id<'goals'>;
  title: string;
  domainId?: Id<'domains'>;
  domainName?: string;
  dayOfWeek?: DayOfWeek;
  dueDate?: number;
};

export type SkippedGoalSummary = {
  id: Id<'goals'>;
  title: string;
  reason: 'already_moved';
  carryOver: CarryOver;
  dailyGoalsCount: number;
  quarterlyGoalId?: Id<'goals'>;
};

export type BaseGoalMoveResult = {
  weekStatesToCopy: WeekStateSummary[];
  dailyGoalsToMove: DailyGoalSummary[];
  quarterlyGoalsToUpdate: QuarterlyGoalSummary[];
  adhocGoalsToMove: AdhocGoalSummary[];
};

export type DryRunResult = BaseGoalMoveResult & {
  isDryRun: true;
  // true when there is something to pull; false when no prior non-empty week
  canPull: boolean;
  // Goals that will be skipped because they already exist in target week
  skippedGoals: SkippedGoalSummary[];
};

export type UpdateResult = BaseGoalMoveResult & {
  weekStatesCopied: number;
  dailyGoalsMoved: number;
  quarterlyGoalsUpdated: number;
  adhocGoalsMoved: number;
};

export type MoveGoalsFromWeekResult<T extends MoveGoalsFromWeekArgs> = T['dryRun'] extends true
  ? DryRunResult
  : UpdateResult;
