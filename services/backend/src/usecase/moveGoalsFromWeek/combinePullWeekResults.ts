import type {
  AdhocDryRunPreview,
  AdhocUpdateResult,
  DryRunResult,
  HierarchicalDryRunPreview,
  HierarchicalUpdateResult,
  UpdateResult,
} from './types';

export function combineDryRunResults(
  hierarchical: HierarchicalDryRunPreview,
  adhoc: AdhocDryRunPreview
): DryRunResult {
  return {
    isDryRun: true,
    canPull: hierarchical.canPull || adhoc.canPull,
    weekStatesToCopy: hierarchical.weekStatesToCopy,
    dailyGoalsToMove: hierarchical.dailyGoalsToMove,
    quarterlyGoalsToUpdate: hierarchical.quarterlyGoalsToUpdate,
    adhocGoalsToMove: adhoc.adhocGoalsToMove,
    skippedGoals: hierarchical.skippedGoals,
  };
}

export function combineUpdateResults(
  hierarchical: HierarchicalUpdateResult,
  adhoc: AdhocUpdateResult
): UpdateResult {
  return {
    weekStatesToCopy: hierarchical.weekStatesToCopy,
    dailyGoalsToMove: hierarchical.dailyGoalsToMove,
    quarterlyGoalsToUpdate: hierarchical.quarterlyGoalsToUpdate,
    adhocGoalsToMove: adhoc.adhocGoalsToMove,
    weekStatesCopied: hierarchical.weekStatesCopied,
    dailyGoalsMoved: hierarchical.dailyGoalsMoved,
    quarterlyGoalsUpdated: hierarchical.quarterlyGoalsUpdated,
    adhocGoalsMoved: adhoc.adhocGoalsMoved,
  };
}

export function emptyDryRunResult(): DryRunResult {
  return {
    isDryRun: true,
    canPull: false,
    weekStatesToCopy: [],
    dailyGoalsToMove: [],
    quarterlyGoalsToUpdate: [],
    adhocGoalsToMove: [],
    skippedGoals: [],
  };
}

export function emptyUpdateResult(): UpdateResult {
  return {
    weekStatesToCopy: [],
    dailyGoalsToMove: [],
    quarterlyGoalsToUpdate: [],
    adhocGoalsToMove: [],
    weekStatesCopied: 0,
    dailyGoalsMoved: 0,
    quarterlyGoalsUpdated: 0,
    adhocGoalsMoved: 0,
  };
}
