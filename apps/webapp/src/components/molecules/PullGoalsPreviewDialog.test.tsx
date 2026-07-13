import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PullGoalsPreviewDialog } from './PullGoalsPreviewDialog';

const baseWeekOptions = [
  { year: 2026, quarter: 2, weekNumber: 10, label: 'Week 10 (past)' },
  { year: 2026, quarter: 2, weekNumber: 11, label: 'Week 11 (past)' },
  { year: 2026, quarter: 2, weekNumber: 12, label: 'Week 12 (current)' },
];

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof PullGoalsPreviewDialog>> = {}
) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    fromWeek: { year: 2026, quarter: 2, weekNumber: 11 },
    toWeek: { year: 2026, quarter: 2, weekNumber: 12 },
    tasksFromPreviousWeek: [],
    tasksFromPastDays: [],
    showPastDaysSection: true,
    todayLabel: 'Wednesday',
    isRefreshingPreview: false,
    isPulling: false,
    weekOptions: baseWeekOptions,
    onFromWeekChange: vi.fn(),
    onToWeekChange: vi.fn(),
    onJumpToLastNonEmpty: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  return { ...render(<PullGoalsPreviewDialog {...props} />), props };
}

describe('PullGoalsPreviewDialog', () => {
  it('renders From/To controls, Jump, and section headings', () => {
    renderDialog({
      tasksFromPreviousWeek: [
        {
          id: 't1',
          title: 'Carry task',
          quarterlyGoal: { id: 'q1', title: 'Q Goal' },
          weeklyGoal: { id: 'w1', title: 'W Goal' },
        },
      ],
      tasksFromPastDays: [
        {
          id: 't2',
          title: 'Past day task',
          quarterlyGoal: { id: 'q1', title: 'Q Goal' },
          weeklyGoal: { id: 'w1', title: 'W Goal' },
        },
      ],
    });

    expect(screen.getByText('Pull Incomplete Goals')).toBeInTheDocument();
    expect(screen.getByText(/Week 11 → Week 12/)).toBeInTheDocument();
    expect(screen.getByText(/Past days → Wednesday/)).toBeInTheDocument();
    expect(screen.getByText('Carry task')).toBeInTheDocument();
    expect(screen.getByText('Past day task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jump/i })).toBeInTheDocument();
  });

  it('disables Pull Goals when there are no tasks', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: /Pull Goals/i })).toBeDisabled();
    expect(screen.getByText(/Nothing to pull for this range/i)).toBeInTheDocument();
  });

  it('calls onJumpToLastNonEmpty when Jump is clicked', () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /Jump/i }));

    expect(props.onJumpToLastNonEmpty).toHaveBeenCalledTimes(1);
  });

  it('hides past-days section when showPastDaysSection is false', () => {
    renderDialog({
      showPastDaysSection: false,
      tasksFromPreviousWeek: [
        {
          id: 't1',
          title: 'Carry task',
          quarterlyGoal: { id: 'q1', title: 'Q Goal' },
          weeklyGoal: { id: 'w1', title: 'W Goal' },
        },
      ],
    });

    expect(screen.queryByText(/Past days →/)).not.toBeInTheDocument();
  });

  it('disables Confirm when isPulling is true', () => {
    renderDialog({
      isPulling: true,
      tasksFromPreviousWeek: [
        {
          id: 't1',
          title: 'Carry task',
          quarterlyGoal: { id: 'q1', title: 'Q Goal' },
          weeklyGoal: { id: 'w1', title: 'W Goal' },
        },
      ],
    });

    const confirmButton = screen.getByRole('button', { name: /Pulling/i });
    expect(confirmButton).toBeDisabled();
  });
});
