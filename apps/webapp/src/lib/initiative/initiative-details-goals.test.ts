import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import {
  formatInitiativeGoalsTabLabel,
  getDefaultInitiativeGoalsTab,
  getEmptyTabMessage,
  getOpenWorkSummary,
  partitionGoalsOpenCompleted,
  type GoalsByInitiative,
} from './initiative-details-goals';

function makeGoal(overrides: Partial<Doc<'goals'>> & { isComplete: boolean }): Doc<'goals'> {
  const { isComplete, ...rest } = overrides;
  return {
    _id: 'goal1' as Doc<'goals'>['_id'],
    _creationTime: 0,
    userId: 'user1' as Doc<'goals'>['userId'],
    year: 2026,
    quarter: 1,
    title: 'Goal',
    inPath: '/',
    depth: 0,
    weekNumber: 1,
    isComplete,
    ...rest,
  } as Doc<'goals'>;
}

const emptyGoals: GoalsByInitiative = {
  quarterly: [],
  weekly: [],
  daily: [],
  adhoc: [],
};

describe('partitionGoalsOpenCompleted', () => {
  it('splits open and completed goals with open first', () => {
    const open = makeGoal({ isComplete: false, title: 'Open' });
    const done = makeGoal({ isComplete: true, title: 'Done', _id: 'goal2' as Doc<'goals'>['_id'] });
    const result = partitionGoalsOpenCompleted([done, open]);
    expect(result.open.map((g) => g.title)).toEqual(['Open']);
    expect(result.completed.map((g) => g.title)).toEqual(['Done']);
  });
});

describe('getDefaultInitiativeGoalsTab', () => {
  it('prefers quarterly when it has open goals', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      quarterly: [makeGoal({ isComplete: false })],
      adhoc: [makeGoal({ isComplete: false, _id: 'adhoc1' as Doc<'goals'>['_id'] })],
    };
    expect(getDefaultInitiativeGoalsTab(goals)).toBe('quarterly');
  });

  it('prefers adhoc when quarterly has no open goals but adhoc does', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      quarterly: [makeGoal({ isComplete: true })],
      adhoc: [makeGoal({ isComplete: false, _id: 'adhoc1' as Doc<'goals'>['_id'] })],
    };
    expect(getDefaultInitiativeGoalsTab(goals)).toBe('adhoc');
  });

  it('falls back to quarterly when only completed quarterly goals exist', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      quarterly: [makeGoal({ isComplete: true })],
    };
    expect(getDefaultInitiativeGoalsTab(goals)).toBe('quarterly');
  });

  it('falls back to weekly when no quarterly or adhoc goals exist', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      weekly: [makeGoal({ isComplete: false, depth: 1 })],
    };
    expect(getDefaultInitiativeGoalsTab(goals)).toBe('weekly');
  });
});

describe('formatInitiativeGoalsTabLabel', () => {
  it('shows open count for quarterly', () => {
    const goals = [
      makeGoal({ isComplete: false }),
      makeGoal({ isComplete: false, _id: 'goal2' as Doc<'goals'>['_id'] }),
      makeGoal({ isComplete: true, _id: 'goal3' as Doc<'goals'>['_id'] }),
    ];
    expect(formatInitiativeGoalsTabLabel('quarterly', goals)).toBe('Quarterly (2 open)');
  });

  it('shows open count for adhoc', () => {
    const goals = [makeGoal({ isComplete: false })];
    expect(formatInitiativeGoalsTabLabel('adhoc', goals)).toBe('Adhoc (1 open)');
  });

  it('shows zero open when all quarterly goals are complete', () => {
    const goals = [makeGoal({ isComplete: true })];
    expect(formatInitiativeGoalsTabLabel('quarterly', goals)).toBe('Quarterly (0 open)');
  });

  it('shows total count for weekly', () => {
    const goals = [
      makeGoal({ isComplete: false }),
      makeGoal({ isComplete: true, _id: 'goal2' as Doc<'goals'>['_id'] }),
    ];
    expect(formatInitiativeGoalsTabLabel('weekly', goals)).toBe('Weekly (2)');
  });

  it('shows tab name only when empty', () => {
    expect(formatInitiativeGoalsTabLabel('daily', [])).toBe('Daily');
  });
});

describe('getOpenWorkSummary', () => {
  it('sums open goals across groups', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      quarterly: [
        makeGoal({ isComplete: false }),
        makeGoal({ isComplete: true, _id: 'q2' as Doc<'goals'>['_id'] }),
      ],
      adhoc: [makeGoal({ isComplete: false, _id: 'a1' as Doc<'goals'>['_id'] })],
    };
    expect(getOpenWorkSummary(goals)).toEqual({
      totalOpen: 2,
      openQuarterly: 1,
      openAdhoc: 1,
    });
  });
});

describe('getEmptyTabMessage', () => {
  it('shows no goals message when empty', () => {
    expect(getEmptyTabMessage('quarterly', [])).toBe(
      'No quarterly goals tagged to this initiative.'
    );
  });

  it('shows all complete message when only completed goals', () => {
    expect(getEmptyTabMessage('adhoc', [makeGoal({ isComplete: true })])).toBe(
      'All adhoc goals are complete.'
    );
  });
});
