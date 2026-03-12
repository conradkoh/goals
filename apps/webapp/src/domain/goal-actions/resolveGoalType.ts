/**
 * Resolve Goal Type
 *
 * Pure utility to determine GoalType from goal properties.
 * No framework dependencies.
 */

import { GoalType } from './types';

interface GoalTypeInfo {
  depth: number;
  adhoc?: { weekNumber?: number } | null;
}

/**
 * Determines the GoalType based on goal depth and adhoc status.
 *
 * - depth 0 + no adhoc → Quarterly
 * - depth 1 + no adhoc → Weekly
 * - depth 2 + no adhoc → Daily
 * - adhoc field present → Adhoc
 */
export function resolveGoalType(goal: GoalTypeInfo): GoalType {
  if (goal.adhoc) return GoalType.Adhoc;
  if (goal.depth === 0) return GoalType.Quarterly;
  if (goal.depth === 1) return GoalType.Weekly;
  return GoalType.Daily;
}
