import { render, screen } from '@testing-library/react';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StandaloneGoalModal } from './StandaloneGoalModal';
import { GoalInitiativeField } from '../view/components/GoalInitiativeField';

import { useGoalContext } from '@/contexts/GoalContext';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useSession } from '@/modules/auth/useSession';

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/modules/auth/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/hooks/useInitiatives', () => ({
  useInitiatives: vi.fn(),
}));

vi.mock('@/hooks/useWeek', () => ({
  WeekProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('./StandardGoalPopoverContent', () => ({
  StandardGoalPopoverContent: function MockStandardGoalPopoverContent() {
    const { goal } = useGoalContext();
    return (
      <GoalInitiativeField
        selectedInitiativeId={goal.initiativeId ?? null}
        onInitiativeChange={vi.fn().mockResolvedValue(undefined)}
      />
    );
  },
}));

vi.mock('./AdhocGoalPopoverContent', () => ({
  AdhocGoalPopoverContent: () => null,
}));

const SESSION_ID = 'session-test' as SessionId;
const GOAL_ID = 'goals:test' as Id<'goals'>;
const INITIATIVE_ID = 'initiatives:alpha' as Id<'initiatives'>;

const initiatives = [
  {
    _id: INITIATIVE_ID,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    title: 'Q1 Launch',
    startDate: 1_700_000_000_000,
    description: undefined,
    endDate: undefined,
  },
];

const weekData = {
  weekLabel: 'Week 1',
  weekNumber: 1,
  mondayDate: 'Jan 1',
  days: [],
  tree: {
    quarterlyGoals: [],
    weekNumber: 1,
    allGoals: [],
  },
};

function makeGoalDetails(initiativeId?: Id<'initiatives'>) {
  return {
    _id: GOAL_ID,
    _creationTime: 0,
    title: 'Tagged Goal',
    isComplete: false,
    isBacklog: false,
    depth: 0,
    year: 2024,
    quarter: 1,
    children: [],
    initiativeId,
  };
}

function mockConvexQueries(goalDetails: ReturnType<typeof makeGoalDetails> | null) {
  vi.mocked(useQuery).mockImplementation(((_query, args) => {
    if (args === 'skip') return undefined;
    if (args && typeof args === 'object' && 'goalId' in args) {
      return goalDetails;
    }
    if (args && typeof args === 'object' && 'weekNumber' in args) {
      return weekData;
    }
    return undefined;
  }) as typeof useQuery);
}

function renderModal() {
  return render(
    <StandaloneGoalModal
      open
      onOpenChange={vi.fn()}
      goalId={GOAL_ID}
      goalCategory="standard"
      year={2024}
      quarter={1}
      weekNumber={1}
    />
  );
}

describe('StandaloneGoalModal initiative display', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ sessionId: SESSION_ID } as ReturnType<
      typeof useSession
    >);
    vi.mocked(useInitiatives).mockReturnValue({
      initiatives,
      createInitiative: vi.fn(),
      updateInitiative: vi.fn(),
      deleteInitiative: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    });
  });

  it('passes initiativeId from getGoalDetails through GoalProvider to the initiative combobox', () => {
    mockConvexQueries(makeGoalDetails(INITIATIVE_ID));

    renderModal();

    expect(screen.getByRole('combobox')).toHaveTextContent('Q1 Launch');
    expect(screen.queryByText('Tag to an initiative...')).not.toBeInTheDocument();
  });

  it('shows placeholder when getGoalDetails omits initiativeId', () => {
    mockConvexQueries(makeGoalDetails(undefined));

    renderModal();

    expect(screen.getByRole('combobox')).toHaveTextContent('Tag to an initiative...');
  });
});
