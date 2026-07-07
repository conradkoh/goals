import type { Doc } from '@workspace/backend/convex/_generated/dataModel';

export type InitiativeGoalsTab = 'quarterly' | 'weekly' | 'daily' | 'adhoc';

export type GoalsByInitiative = {
  quarterly: Doc<'goals'>[];
  weekly: Doc<'goals'>[];
  daily: Doc<'goals'>[];
  adhoc: Doc<'goals'>[];
};

function countOpenGoals(goals: Doc<'goals'>[]): number {
  return goals.filter((goal) => !goal.isComplete).length;
}

function sortGoalsOpenFirst(goals: Doc<'goals'>[]): Doc<'goals'>[] {
  return [...goals].sort((a, b) => {
    if (a.isComplete === b.isComplete) return 0;
    return a.isComplete ? 1 : -1;
  });
}

/**
 * Pick initial tab prioritizing open quarterly, then open adhoc, then first non-empty group.
 */
// fallow-ignore-next-line complexity
export function getDefaultInitiativeGoalsTab(goals: GoalsByInitiative): InitiativeGoalsTab {
  if (countOpenGoals(goals.quarterly) > 0) return 'quarterly';
  if (countOpenGoals(goals.adhoc) > 0) return 'adhoc';
  if (goals.quarterly.length > 0) return 'quarterly';
  if (goals.adhoc.length > 0) return 'adhoc';
  if (goals.weekly.length > 0) return 'weekly';
  if (goals.daily.length > 0) return 'daily';
  return 'quarterly';
}

/** Tab label with open count emphasis for quarterly/adhoc; weekly/daily show total only. */
// fallow-ignore-next-line complexity
export function formatInitiativeGoalsTabLabel(
  tab: InitiativeGoalsTab,
  goals: Doc<'goals'>[]
): string {
  const open = countOpenGoals(goals);
  const names: Record<InitiativeGoalsTab, string> = {
    quarterly: 'Quarterly',
    weekly: 'Weekly',
    daily: 'Daily',
    adhoc: 'Adhoc',
  };
  const name = names[tab];
  if (tab === 'quarterly' || tab === 'adhoc') {
    if (open > 0) return `${name} (${open} open)`;
    return goals.length > 0 ? `${name} (0 open)` : name;
  }
  return goals.length > 0 ? `${name} (${goals.length})` : name;
}

export function partitionGoalsOpenCompleted(goals: Doc<'goals'>[]): {
  open: Doc<'goals'>[];
  completed: Doc<'goals'>[];
} {
  const sorted = sortGoalsOpenFirst(goals);
  return {
    open: sorted.filter((goal) => !goal.isComplete),
    completed: sorted.filter((goal) => goal.isComplete),
  };
}

export function getOpenWorkSummary(goals: GoalsByInitiative): {
  totalOpen: number;
  openQuarterly: number;
  openAdhoc: number;
} {
  const openQuarterly = countOpenGoals(goals.quarterly);
  const openAdhoc = countOpenGoals(goals.adhoc);
  return {
    totalOpen:
      openQuarterly + countOpenGoals(goals.weekly) + countOpenGoals(goals.daily) + openAdhoc,
    openQuarterly,
    openAdhoc,
  };
}

const tabGoalTypeLabel: Record<InitiativeGoalsTab, string> = {
  quarterly: 'quarterly',
  weekly: 'weekly',
  daily: 'daily',
  adhoc: 'adhoc',
};

export function getEmptyTabMessage(tab: InitiativeGoalsTab, goals: Doc<'goals'>[]): string {
  const label = tabGoalTypeLabel[tab];
  if (goals.length === 0) {
    return `No ${label} goals tagged to this initiative.`;
  }
  return `All ${label} goals are complete.`;
}
