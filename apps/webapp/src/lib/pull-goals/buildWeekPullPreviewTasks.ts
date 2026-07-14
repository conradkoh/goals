import type { PreviewTask } from '@/components/molecules/PullGoalsPreviewDialog';

export type WeekPullDryRunLike = {
  dailyGoalsToMove: {
    id: string;
    title: string;
    weeklyGoalId: string;
    weeklyGoalTitle: string;
    quarterlyGoalId?: string;
    quarterlyGoalTitle?: string;
  }[];
  weekStatesToCopy: {
    id: string;
    title: string;
    dailyGoalsCount: number;
    quarterlyGoalId?: string;
    quarterlyGoalTitle?: string;
  }[];
  quarterlyGoalsToUpdate: {
    id: string;
    title: string;
    isStarred: boolean;
    isPinned: boolean;
  }[];
  adhocGoalsToMove: {
    id: string;
    title: string;
    domainId?: string;
    domainName?: string;
  }[];
};

function weeklyIdsWithDailyTasks(dailyGoals: WeekPullDryRunLike['dailyGoalsToMove']): Set<string> {
  return new Set(dailyGoals.map((d) => d.weeklyGoalId));
}

function buildQuarterlyStatus(
  quarterlyGoalId: string | undefined,
  quarterlyGoalTitle: string | undefined,
  quarterlyGoalsToUpdate: WeekPullDryRunLike['quarterlyGoalsToUpdate']
): PreviewTask['quarterlyGoal'] {
  const quarterlyStatus = quarterlyGoalId
    ? quarterlyGoalsToUpdate.find((q) => q.id === quarterlyGoalId)
    : undefined;

  return {
    id: quarterlyGoalId ?? '',
    title: quarterlyGoalTitle ?? 'Quarterly Goal',
    isStarred: quarterlyStatus?.isStarred ?? false,
    isPinned: quarterlyStatus?.isPinned ?? false,
  };
}

export function buildWeekPullPreviewTasks(result: WeekPullDryRunLike): PreviewTask[] {
  const tasks: PreviewTask[] = [];

  // 1) Map dailyGoalsToMove → PreviewTask
  for (const dailyGoal of result.dailyGoalsToMove) {
    tasks.push({
      id: dailyGoal.id,
      title: dailyGoal.title,
      quarterlyGoal: buildQuarterlyStatus(
        dailyGoal.quarterlyGoalId,
        dailyGoal.quarterlyGoalTitle,
        result.quarterlyGoalsToUpdate
      ),
      weeklyGoal: {
        id: dailyGoal.weeklyGoalId,
        title: dailyGoal.weeklyGoalTitle,
      },
    });
  }

  // 2) For each weekStatesToCopy whose weekly id is NOT already represented by a daily task,
  //    append a PreviewTask for the weekly goal itself (no daily children to show).
  const weeklyWithDailyIds = weeklyIdsWithDailyTasks(result.dailyGoalsToMove);
  for (const weekly of result.weekStatesToCopy) {
    if (weeklyWithDailyIds.has(weekly.id)) continue;

    tasks.push({
      id: weekly.id,
      title: weekly.title,
      quarterlyGoal: buildQuarterlyStatus(
        weekly.quarterlyGoalId,
        weekly.quarterlyGoalTitle,
        result.quarterlyGoalsToUpdate
      ),
      weeklyGoal: {
        id: weekly.id,
        title: weekly.title,
      },
    });
  }

  // 3) Append adhoc tasks
  for (const adhoc of result.adhocGoalsToMove) {
    tasks.push({
      id: adhoc.id,
      title: adhoc.title,
      details: undefined,
      quarterlyGoal: {
        id: 'adhoc',
        title: 'Adhoc Tasks',
        isStarred: false,
        isPinned: false,
      },
      weeklyGoal: {
        id: `adhoc-domain-${adhoc.domainId || 'uncategorized'}`,
        title: adhoc.domainName || 'Uncategorized',
      },
    });
  }

  return tasks;
}
