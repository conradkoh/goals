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

  it('still shows From week when Jump lands on a week missing from weekOptions', () => {
    renderDialog({
      fromWeek: { year: 2026, quarter: 3, weekNumber: 26 },
      toWeek: { year: 2026, quarter: 3, weekNumber: 29 },
      weekOptions: [
        { year: 2026, quarter: 3, weekNumber: 27, label: 'Week 27 (past)' },
        { year: 2026, quarter: 3, weekNumber: 28, label: 'Week 28 (past)' },
        { year: 2026, quarter: 3, weekNumber: 29, label: 'Week 29 (current)' },
      ],
    });

    // The Select must display "Week 26" even though 26 is not in weekOptions,
    // because the dialog appends a synthetic option for the current fromWeek.
    expect(screen.getByText('Week 26')).toBeInTheDocument();
  });

  it('shows a tooltip describing what Jump does', async () => {
    renderDialog();

    const jumpButton = screen.getByRole('button', { name: /Jump/i });
    fireEvent.pointerMove(jumpButton);
    fireEvent.focus(jumpButton);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toMatch(
      /Jump to the last earlier week in this quarter that still has incomplete goals/i
    );
  });

  it('dismisses when the overlay outside the modal is clicked', () => {
    const { props } = renderDialog();

    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
    expect(overlay).toBeTruthy();
    if (!overlay) {
      throw new Error('Expected alert-dialog overlay to be present');
    }
    fireEvent.click(overlay);

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
