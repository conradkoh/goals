import { describe, expect, it } from 'vitest';

import { buildWeekPullPreviewTasks } from './buildWeekPullPreviewTasks';
import type { WeekPullDryRunLike } from './buildWeekPullPreviewTasks';

const baseQuarterlyGoals = [{ id: 'q-1', title: 'Q Goal', isStarred: false, isPinned: false }];

describe('buildWeekPullPreviewTasks', () => {
  it('includes incomplete weekly goals with no daily children', () => {
    const result: WeekPullDryRunLike = {
      dailyGoalsToMove: [],
      weekStatesToCopy: [
        {
          id: 'weekly-1',
          title: 'Ship incomplete weekly',
          dailyGoalsCount: 0,
          quarterlyGoalId: 'q-1',
          quarterlyGoalTitle: 'Q Goal',
        },
      ],
      quarterlyGoalsToUpdate: baseQuarterlyGoals,
      adhocGoalsToMove: [],
    };

    const tasks = buildWeekPullPreviewTasks(result);

    expect(tasks).toEqual([
      expect.objectContaining({
        id: 'weekly-1',
        title: 'Ship incomplete weekly',
        weeklyGoal: { id: 'weekly-1', title: 'Ship incomplete weekly' },
        quarterlyGoal: expect.objectContaining({ id: 'q-1', title: 'Q Goal' }),
      }),
    ]);
  });

  it('does not duplicate a weekly that already has daily tasks', () => {
    const result: WeekPullDryRunLike = {
      dailyGoalsToMove: [
        {
          id: 'daily-1',
          title: 'A daily task',
          weeklyGoalId: 'weekly-1',
          weeklyGoalTitle: 'W Goal',
          quarterlyGoalId: 'q-1',
          quarterlyGoalTitle: 'Q Goal',
        },
      ],
      weekStatesToCopy: [
        {
          id: 'weekly-1',
          title: 'W Goal',
          dailyGoalsCount: 1,
          quarterlyGoalId: 'q-1',
          quarterlyGoalTitle: 'Q Goal',
        },
      ],
      quarterlyGoalsToUpdate: baseQuarterlyGoals,
      adhocGoalsToMove: [],
    };

    const tasks = buildWeekPullPreviewTasks(result);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual(
      expect.objectContaining({
        id: 'daily-1',
        title: 'A daily task',
        weeklyGoal: { id: 'weekly-1', title: 'W Goal' },
      })
    );
  });

  it('still includes adhoc tasks', () => {
    const result: WeekPullDryRunLike = {
      dailyGoalsToMove: [],
      weekStatesToCopy: [],
      quarterlyGoalsToUpdate: [],
      adhocGoalsToMove: [
        {
          id: 'adhoc-1',
          title: 'Adhoc task',
          domainId: 'domain-1',
          domainName: 'My Domain',
        },
      ],
    };

    const tasks = buildWeekPullPreviewTasks(result);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual(
      expect.objectContaining({
        id: 'adhoc-1',
        title: 'Adhoc task',
        weeklyGoal: { id: 'adhoc-domain-domain-1', title: 'My Domain' },
      })
    );
  });

  it('combines daily, weekly-only, and adhoc tasks', () => {
    const result: WeekPullDryRunLike = {
      dailyGoalsToMove: [
        {
          id: 'daily-1',
          title: 'Daily task',
          weeklyGoalId: 'weekly-1',
          weeklyGoalTitle: 'W1 Goal',
          quarterlyGoalId: 'q-1',
          quarterlyGoalTitle: 'Q1',
        },
      ],
      weekStatesToCopy: [
        {
          id: 'weekly-2',
          title: 'Weekly-only task',
          dailyGoalsCount: 0,
          quarterlyGoalId: 'q-2',
          quarterlyGoalTitle: 'Q2',
        },
      ],
      quarterlyGoalsToUpdate: [
        { id: 'q-1', title: 'Q1', isStarred: false, isPinned: false },
        { id: 'q-2', title: 'Q2', isStarred: true, isPinned: false },
      ],
      adhocGoalsToMove: [
        {
          id: 'adhoc-1',
          title: 'Adhoc task',
        },
      ],
    };

    const tasks = buildWeekPullPreviewTasks(result);

    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.id)).toEqual(['daily-1', 'weekly-2', 'adhoc-1']);
  });

  it('handles weekStatesToCopy without quarterlyGoalId gracefully', () => {
    const result: WeekPullDryRunLike = {
      dailyGoalsToMove: [],
      weekStatesToCopy: [
        {
          id: 'weekly-1',
          title: 'Orphan weekly',
          dailyGoalsCount: 0,
        },
      ],
      quarterlyGoalsToUpdate: [],
      adhocGoalsToMove: [],
    };

    const tasks = buildWeekPullPreviewTasks(result);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].quarterlyGoal.id).toBe('');
    expect(tasks[0].quarterlyGoal.title).toBe('Quarterly Goal');
  });
});
