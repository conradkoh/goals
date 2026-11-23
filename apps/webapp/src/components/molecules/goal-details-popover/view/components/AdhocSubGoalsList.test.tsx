import { render, screen } from '@testing-library/react';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { describe, expect, it, vi } from 'vitest';

import { AdhocSubGoalsList } from './AdhocSubGoalsList';

// jsdom cannot load the editor CSS pulled in through the popover module graph.
vi.mock('@/components/ui/rich-text-editor.module.css', () => ({ default: {} }));

// AdhocGoalActionIcons needs the fire/pending status data. Provide an inert adapter instead of
// a live Convex provider; the status icons are not under test.
vi.mock('@/contexts/GoalStatusContext', () => ({
  GoalStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FireGoalsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGoalStatus: () => ({
    fireGoals: new Set<string>(),
    toggleFireStatus: () => undefined,
    isOnFire: () => false,
    pendingGoals: new Map<string, string>(),
    isPending: () => false,
    getPendingDescription: () => undefined,
    setPendingStatus: () => undefined,
    clearPendingStatus: () => undefined,
  }),
  useFireGoals: () => ({
    fireGoals: new Set<string>(),
    toggleFireStatus: () => undefined,
    isOnFire: () => false,
  }),
  useFireGoalStatus: () => ({ isOnFire: false, toggleFireStatus: () => undefined }),
  usePendingGoalStatus: () => ({
    isPending: false,
    getPendingDescription: () => undefined,
    setPendingStatus: () => undefined,
    clearPendingStatus: () => undefined,
  }),
}));

function makeSubGoal(id: string, title: string): AdhocGoalWithChildren {
  return {
    _id: id as Id<'goals'>,
    _creationTime: 1,
    userId: 'users:test' as Id<'users'>,
    year: 2026,
    quarter: 1,
    title,
    details: undefined,
    dueDate: undefined,
    domainId: undefined,
    initiativeId: undefined,
    parentId: undefined,
    inPath: '/',
    depth: 1,
    isComplete: false,
    children: [],
  };
}

describe('AdhocSubGoalsList', () => {
  it('shows its separator by default', () => {
    const { container } = render(
      <AdhocSubGoalsList
        subGoals={[makeSubGoal('goals:child', 'Buy milk')]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
      />
    );

    expect(container.querySelector(':scope > [data-slot="separator"]')).not.toBeNull();
    expect(screen.getByText('Sub-tasks')).toBeInTheDocument();
  });

  it('hides its separator when showSeparator is false, keeping the heading', () => {
    const { container } = render(
      <AdhocSubGoalsList
        subGoals={[makeSubGoal('goals:child', 'Buy milk')]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
        showSeparator={false}
      />
    );

    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
    expect(screen.getByText('Sub-tasks')).toBeInTheDocument();
  });

  it('renders nothing when there are no sub-goals and no way to create them', () => {
    const { container } = render(
      <AdhocSubGoalsList
        subGoals={[]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
        showSeparator={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
