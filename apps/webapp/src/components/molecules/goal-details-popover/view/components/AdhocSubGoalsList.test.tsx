import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('collapses sub-tasks behind a count summary by default', () => {
    render(
      <AdhocSubGoalsList
        subGoals={[makeSubGoal('goals:a', 'Buy milk'), makeSubGoal('goals:b', 'Walk dog')]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
      />
    );

    const trigger = screen.getByRole('button', { name: /Sub-tasks/ });
    expect(trigger).toHaveTextContent('2 sub-tasks');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Buy milk')).not.toBeVisible();
  });

  it('keeps the create input visible while collapsed', () => {
    render(
      <AdhocSubGoalsList
        subGoals={[makeSubGoal('goals:a', 'Buy milk')]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
        onCreateChild={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByPlaceholderText('Add a new sub-task...')).toBeVisible();
    expect(screen.getByRole('button', { name: /Sub-tasks/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('counts a sub-task created while collapsed without expanding', async () => {
    const user = userEvent.setup();
    // Never resolves: the optimistic sub-task stays in the list for the assertion.
    const onCreateChild = vi.fn(() => new Promise<void>(() => {}));
    render(
      <AdhocSubGoalsList
        subGoals={[makeSubGoal('goals:a', 'Buy milk')]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
        onCreateChild={onCreateChild}
      />
    );

    await user.type(screen.getByPlaceholderText('Add a new sub-task...'), 'Walk dog{Enter}');

    expect(onCreateChild).toHaveBeenCalledWith('goals:parent', 'Walk dog');
    const trigger = screen.getByRole('button', { name: /Sub-tasks/ });
    expect(trigger).toHaveTextContent('2 sub-tasks');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('counts only top-level sub-tasks when they have their own children', () => {
    const parentTask = {
      ...makeSubGoal('goals:a', 'Buy milk'),
      children: [makeSubGoal('goals:a1', 'Whole milk')],
    };
    render(
      <AdhocSubGoalsList
        subGoals={[parentTask]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
      />
    );

    const trigger = screen.getByRole('button', { name: /Sub-tasks/ });
    expect(trigger).toHaveTextContent('1 sub-task');
    expect(trigger).not.toHaveTextContent('·');
  });

  it('keeps the plain heading and no disclosure when there are no sub-tasks', () => {
    render(
      <AdhocSubGoalsList
        subGoals={[]}
        currentDepth={1}
        parentId={'goals:parent' as Id<'goals'>}
        onCreateChild={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('heading', { name: 'Sub-tasks' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sub-tasks/ })).toBeNull();
  });
});
