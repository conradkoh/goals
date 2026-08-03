import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import {
  formatInitiativeGoalsTabLabel,
  formatInitiativeParentGoalLabel,
  getDefaultInitiativeGoalsTab,
  getEmptyTabMessage,
  getInitiativeCreateBlockedMessage,
  getOpenWorkSummary,
  partitionGoalsOpenCompleted,
  pickDefaultParentGoal,
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

describe('formatInitiativeParentGoalLabel', () => {
  it('formats quarter, year, title', () => {
    const goal = makeGoal({ isComplete: false, quarter: 2, year: 2025, title: 'Launch' });
    expect(formatInitiativeParentGoalLabel(goal)).toBe('Q2 2025 — Launch');
  });

  it('marks completed goals', () => {
    const goal = makeGoal({ isComplete: true, quarter: 1, year: 2024, title: 'Launch' });
    expect(formatInitiativeParentGoalLabel(goal)).toBe('Q1 2024 — Launch (done)');
  });
});

describe('getInitiativeCreateBlockedMessage', () => {
  it('blocks weekly when no quarterly goals exist', () => {
    expect(getInitiativeCreateBlockedMessage('weekly', emptyGoals)).toBe(
      'Add a quarterly goal in the Quarterly tab first.'
    );
  });

  it('does not block weekly when quarterly goals exist', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      quarterly: [makeGoal({ isComplete: false })],
    };
    expect(getInitiativeCreateBlockedMessage('weekly', goals)).toBeNull();
  });

  it('blocks daily when no weekly goals exist', () => {
    expect(getInitiativeCreateBlockedMessage('daily', emptyGoals)).toBe(
      'Add a weekly goal in the Weekly tab first.'
    );
  });

  it('does not block daily when weekly goals exist', () => {
    const goals: GoalsByInitiative = {
      ...emptyGoals,
      weekly: [makeGoal({ isComplete: false, depth: 1 })],
    };
    expect(getInitiativeCreateBlockedMessage('daily', goals)).toBeNull();
  });
});

describe('pickDefaultParentGoal', () => {
  it('prefers a parent in the focus year and quarter', () => {
    const inFocus = makeGoal({ isComplete: false, year: 2026, quarter: 1, title: 'Focus' });
    const other = makeGoal({
      isComplete: false,
      year: 2025,
      quarter: 3,
      title: 'Other',
      _id: 'goal2' as Doc<'goals'>['_id'],
    });
    expect(pickDefaultParentGoal([other, inFocus], 2026, 1)).toBe(inFocus);
  });

  it('falls back to the first parent when none match focus', () => {
    const first = makeGoal({ isComplete: false, year: 2025, quarter: 3, title: 'First' });
    const second = makeGoal({
      isComplete: false,
      year: 2024,
      quarter: 2,
      title: 'Second',
      _id: 'goal2' as Doc<'goals'>['_id'],
    });
    expect(pickDefaultParentGoal([first, second], 2026, 1)).toBe(first);
  });

  it('returns null when no parents exist', () => {
    expect(pickDefaultParentGoal([], 2026, 1)).toBeNull();
  });
});
