import { render, screen } from '@testing-library/react';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, it, vi } from 'vitest';

import { GoalInitiativeField } from './GoalInitiativeField';

import { useInitiatives } from '@/hooks/useInitiatives';
import { useSession } from '@/modules/auth/useSession';

vi.mock('@/hooks/useInitiatives', () => ({
  useInitiatives: vi.fn(),
}));

vi.mock('@/modules/auth/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const SESSION_ID = 'session-test' as SessionId;
const INITIATIVE_A_ID = 'initiatives:alpha' as Id<'initiatives'>;
const INITIATIVE_B_ID = 'initiatives:beta' as Id<'initiatives'>;

function makeInitiative(
  overrides: Partial<Doc<'initiatives'>> & Pick<Doc<'initiatives'>, '_id' | 'title' | 'startDate'>
): Doc<'initiatives'> {
  return {
    _creationTime: 0,
    userId: 'users:test' as Doc<'initiatives'>['userId'],
    description: undefined,
    endDate: undefined,
    ...overrides,
  };
}

const initiatives = [
  makeInitiative({
    _id: INITIATIVE_A_ID,
    title: 'Q1 Launch',
    startDate: 1_700_000_000_000,
  }),
  makeInitiative({
    _id: INITIATIVE_B_ID,
    title: 'Platform Hardening',
    startDate: 1_700_100_000_000,
  }),
];

describe('GoalInitiativeField', () => {
  it('shows the tagged initiative title in the combobox when selectedInitiativeId is set', () => {
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

    render(
      <GoalInitiativeField
        selectedInitiativeId={INITIATIVE_A_ID}
        onInitiativeChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Q1 Launch');
    expect(screen.queryByText('Tag to an initiative...')).not.toBeInTheDocument();
  });

  it('shows placeholder when selectedInitiativeId is null', () => {
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

    render(
      <GoalInitiativeField
        selectedInitiativeId={null}
        onInitiativeChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Tag to an initiative...');
  });

  it('updates displayed initiative when selectedInitiativeId prop changes', () => {
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

    const { rerender } = render(
      <GoalInitiativeField
        selectedInitiativeId={null}
        onInitiativeChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Tag to an initiative...');

    rerender(
      <GoalInitiativeField
        selectedInitiativeId={INITIATIVE_B_ID}
        onInitiativeChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Platform Hardening');
  });
});
