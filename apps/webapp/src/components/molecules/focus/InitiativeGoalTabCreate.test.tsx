import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InitiativeGoalTabCreate } from './InitiativeGoalTabCreate';

import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import type { GoalsByInitiative } from '@/lib/initiative/initiative-details-goals';
import { useSession } from '@/modules/auth/useSession';

vi.mock('@/hooks/useWeek', () => ({
  useWeek: vi.fn(),
}));

vi.mock('@/hooks/useAdhocGoals', () => ({
  useAdhocGoals: vi.fn(),
}));

vi.mock('@/modules/auth/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const SESSION_ID = 'session-test' as const;
const INITIATIVE_ID = 'initiatives:alpha' as Id<'initiatives'>;
const QUARTERLY_ID = 'goals:quarterly' as Id<'goals'>;
const WEEKLY_ID = 'goals:weekly' as Id<'goals'>;

function makeGoal(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: QUARTERLY_ID,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    year: 2026,
    quarter: 1,
    title: 'Parent Goal',
    inPath: '/',
    depth: 0,
    isComplete: false,
    ...overrides,
  };
}

const emptyGoals: GoalsByInitiative = {
  quarterly: [],
  weekly: [],
  daily: [],
  adhoc: [],
};

const weeklyGoals: GoalsByInitiative = {
  ...emptyGoals,
  quarterly: [makeGoal() as never],
  weekly: [makeGoal({ _id: WEEKLY_ID, depth: 1 }) as never],
};

const createQuarterlyGoal = vi.fn().mockResolvedValue(undefined);
const createWeeklyGoal = vi.fn().mockResolvedValue(undefined);
const createDailyGoal = vi.fn().mockResolvedValue(undefined);
const createAdhocGoal = vi.fn().mockResolvedValue('goals:new' as Id<'goals'>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({ sessionId: SESSION_ID } as ReturnType<typeof useSession>);
  vi.mocked(useWeek).mockReturnValue({
    year: 2026,
    quarter: 1,
    weekNumber: 1,
    createQuarterlyGoal,
    createWeeklyGoal,
    createDailyGoal,
  } as unknown as ReturnType<typeof useWeek>);
  vi.mocked(useAdhocGoals).mockReturnValue({
    createAdhocGoal,
  } as unknown as ReturnType<typeof useAdhocGoals>);
});

describe('InitiativeGoalTabCreate', () => {
  it('renders an input for quarterly and submits with initiativeId', async () => {
    const user = userEvent.setup();
    render(
      <InitiativeGoalTabCreate
        tab="quarterly"
        initiativeId={INITIATIVE_ID}
        goalsByType={emptyGoals}
      />
    );

    const input = screen.getByPlaceholderText('Add a quarterly goal…');
    await user.type(input, 'New quarterly');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(createQuarterlyGoal).toHaveBeenCalledWith({
      title: 'New quarterly',
      year: 2026,
      quarter: 1,
      weekNumber: 1,
      initiativeId: INITIATIVE_ID,
    });
  });

  it('shows a blocked message instead of an input when weekly has no quarterly parents', () => {
    render(
      <InitiativeGoalTabCreate tab="weekly" initiativeId={INITIATIVE_ID} goalsByType={emptyGoals} />
    );

    expect(
      screen.getByText('Add a quarterly goal in the Quarterly tab first.')
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a weekly goal…')).not.toBeInTheDocument();
  });

  it('shows a day selector when daily has parents', async () => {
    const user = userEvent.setup();
    render(
      <InitiativeGoalTabCreate tab="daily" initiativeId={INITIATIVE_ID} goalsByType={weeklyGoals} />
    );

    const input = screen.getByPlaceholderText('Add a daily goal…');
    await user.click(input);

    expect(screen.getAllByRole('combobox').length).toBe(2);
  });

  it('submits an adhoc task with initiativeId as the trailing argument', async () => {
    const user = userEvent.setup();
    render(
      <InitiativeGoalTabCreate tab="adhoc" initiativeId={INITIATIVE_ID} goalsByType={emptyGoals} />
    );

    const input = screen.getByPlaceholderText('Add a task…');
    await user.type(input, 'New task');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(createAdhocGoal).toHaveBeenCalledTimes(1);
    const args = createAdhocGoal.mock.calls[0];
    expect(args[0]).toBe('New task');
    expect(args[8]).toBe(INITIATIVE_ID);
  });
});
