import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { describe, expect, it, vi } from 'vitest';

import { GoalDetailsChildrenList } from './GoalDetailsChildrenList';

vi.mock('@/hooks/useWeek', () => ({
  useWeek: () => ({ updateQuarterlyGoalTitle: vi.fn(), deleteGoalOptimistic: vi.fn() }),
}));

// Rows read their goal from GoalContext; each stub renders a distinct marker + title.
vi.mock('@/components/molecules/day-of-week/components/WeeklyGoalTaskItem', async () => {
  const { useGoalContext } = await import('@/contexts/GoalContext');
  return {
    WeeklyGoalTaskItem: function WeeklyGoalTaskItemStub() {
      return <div>{`weekly: ${useGoalContext().goal.title}`}</div>;
    },
  };
});
vi.mock('@/components/organisms/DailyGoalTaskItem', async () => {
  const { useGoalContext } = await import('@/contexts/GoalContext');
  return {
    DailyGoalTaskItem: function DailyGoalTaskItemStub() {
      return <div>{`daily: ${useGoalContext().goal.title}`}</div>;
    },
  };
});

function makeGoal(id: string, title: string, depth: number, children: unknown[] = []) {
  return {
    _id: id as Id<'goals'>,
    _creationTime: 1,
    title,
    depth,
    isComplete: false,
    inPath: '/',
    children,
  };
}

/** Mirrors dashboard.getGoalDetails children on the breadcrumb path: no `children` key at all. */
function makeGoalWithoutChildren(id: string, title: string, depth: number) {
  return { _id: id as Id<'goals'>, _creationTime: 1, title, depth, isComplete: false, inPath: '/' };
}

function asParent(goal: object) {
  return goal as unknown as GoalWithDetailsAndChildren;
}

describe('GoalDetailsChildrenList', () => {
  it('keeps the always-expanded heading when not collapsible', () => {
    const parent = asParent(
      makeGoal('goals:q', 'Quarter', 0, [
        makeGoal('goals:w1', 'Week one', 1),
        makeGoal('goals:w2', 'Week two', 1),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" />);

    expect(screen.getByRole('heading', { name: 'Weekly Goals' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Weekly Goals/ })).toBeNull();
    expect(screen.getByText('weekly: Week one')).toBeVisible();
  });

  it('collapses behind a count summary when collapsible', async () => {
    const user = userEvent.setup();
    const parent = asParent(
      makeGoal('goals:q', 'Quarter', 0, [
        makeGoal('goals:w1', 'Week one', 1),
        makeGoal('goals:w2', 'Week two', 1),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" collapsible />);

    expect(screen.queryByRole('heading', { name: 'Weekly Goals' })).toBeNull();
    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    expect(trigger).toHaveTextContent('2 weekly goals');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('weekly: Week one')).not.toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('weekly: Week one')).toBeVisible();
  });

  it('adds the grandchild count for a quarterly parent', () => {
    const parent = asParent(
      makeGoal('goals:q', 'Quarter', 0, [
        makeGoal('goals:w1', 'Week one', 1, [
          makeGoal('goals:d1', 'Day 1', 2),
          makeGoal('goals:d2', 'Day 2', 2),
          makeGoal('goals:d3', 'Day 3', 2),
        ]),
        makeGoal('goals:w2', 'Week two', 1, [makeGoal('goals:d4', 'Day 4', 2)]),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" collapsible />);

    expect(screen.getByRole('button', { name: /Weekly Goals/ })).toHaveTextContent(
      '2 weekly goals · 4 daily goals'
    );
  });

  it('uses the daily noun for a weekly parent and omits a secondary part', () => {
    const parent = asParent(
      makeGoal('goals:w', 'Week', 1, [
        makeGoal('goals:d1', 'Day 1', 2),
        makeGoal('goals:d2', 'Day 2', 2),
        makeGoal('goals:d3', 'Day 3', 2),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Daily Goals" collapsible />);

    const trigger = screen.getByRole('button', { name: /Daily Goals/ });
    expect(trigger).toHaveTextContent('3 daily goals');
    expect(trigger).not.toHaveTextContent('·');
  });

  it('uses the singular noun for one child', () => {
    const parent = asParent(
      makeGoal('goals:q', 'Quarter', 0, [makeGoal('goals:w1', 'Week one', 1)])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" collapsible />);

    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    expect(trigger).toHaveTextContent('1 weekly goal');
    expect(trigger).not.toHaveTextContent('1 weekly goals');
  });

  it('renders a weekly row for quarterly children and a daily row for each grandchild', () => {
    const parent = asParent(
      makeGoal('goals:q', 'Quarter', 0, [
        makeGoal('goals:w1', 'Week one', 1, [makeGoal('goals:d1', 'Day 1', 2)]),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" />);

    expect(screen.getByText('weekly: Week one')).toBeVisible();
    expect(screen.getByText('daily: Day 1')).toBeVisible();
    expect(screen.queryByText('daily: Week one')).toBeNull();
  });

  it('renders daily rows for weekly children', () => {
    const parent = asParent(
      makeGoal('goals:w', 'Week', 1, [
        makeGoal('goals:d1', 'Day 1', 2),
        makeGoal('goals:d2', 'Day 2', 2),
      ])
    );
    render(<GoalDetailsChildrenList parentGoal={parent} title="Daily Goals" />);

    expect(screen.getByText('daily: Day 1')).toBeVisible();
    expect(screen.queryByText(/^weekly: /)).toBeNull();
  });

  it('renders quarterly children that omit `children` without throwing (collapsible)', async () => {
    const user = userEvent.setup();
    const parent = asParent({
      ...makeGoal('goals:q', 'Quarter', 0),
      children: [
        makeGoalWithoutChildren('goals:w1', 'Week one', 1),
        makeGoalWithoutChildren('goals:w2', 'Week two', 1),
      ],
    });
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" collapsible />);

    await user.click(screen.getByRole('button', { name: /Weekly Goals/ }));
    expect(screen.getByText('weekly: Week one')).toBeVisible();
    expect(screen.getByText('weekly: Week two')).toBeVisible();
  });

  it('renders quarterly children that omit `children` without throwing (not collapsible)', () => {
    const parent = asParent({
      ...makeGoal('goals:q', 'Quarter', 0),
      children: [makeGoalWithoutChildren('goals:w1', 'Week one', 1)],
    });
    render(<GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" />);

    expect(screen.getByText('weekly: Week one')).toBeVisible();
  });

  it('renders nothing when there are no children, even when collapsible', () => {
    const parent = asParent(makeGoal('goals:q', 'Quarter', 0, []));
    const { container } = render(
      <GoalDetailsChildrenList parentGoal={parent} title="Weekly Goals" collapsible />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
