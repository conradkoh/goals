/**
 * Generic goal helpers organized by purpose.
 *
 * These are reusable utilities for goal operations that may be used
 * across multiple use cases.
 *
 * For use-case-specific helpers, see:
 * - moveGoalsFromWeek/ - for week-to-week goal migration
 * - moveGoalsFromQuarter/ - for quarter-to-quarter goal migration (pull goals)
 */

// Create goal helpers
export {
  createGoalState,
  createGoalWithCarryOver,
  GoalDepth,
  type CreateGoalStateParams,
  type CreateGoalWithCarryOverParams,
  type GoalDepthValue,
} from './create-goal';

// Filter helpers
export { deduplicateByRootGoalId } from './filter';
