import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';

import { InitiativeActionMenu } from './InitiativeActionMenu';

function makeInitiative(
  overrides: Partial<Doc<'initiatives'>> & Pick<Doc<'initiatives'>, 'title' | 'startDate'>
): Doc<'initiatives'> {
  return {
    _id: 'initiatives:test' as Doc<'initiatives'>['_id'],
    _creationTime: 0,
    userId: 'users:test' as Doc<'initiatives'>['userId'],
    endDate: undefined,
    description: undefined,
    ...overrides,
  };
}

describe('InitiativeActionMenu mark complete', () => {
  it('opens complete dialog instead of calling onEndDateChange immediately', async () => {
    const user = userEvent.setup();
    const onEndDateChange = vi.fn().mockResolvedValue(undefined);
    const initiative = makeInitiative({
      title: 'Ongoing',
      startDate: DateTime.now().minus({ months: 1 }).startOf('day').toMillis(),
    });

    render(
      <InitiativeActionMenu
        initiative={initiative}
        onEdit={vi.fn()}
        onEndDateChange={onEndDateChange}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /mark as complete/i }));

    expect(onEndDateChange).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /complete initiative/i })).toBeInTheDocument();
  });

  it('calls onEndDateChange with selected date when user confirms', async () => {
    const user = userEvent.setup();
    const onEndDateChange = vi.fn().mockResolvedValue(undefined);
    const startDate = DateTime.fromObject({ year: 2026, month: 1, day: 1 })
      .startOf('day')
      .toMillis();
    const initiative = makeInitiative({ title: 'Ongoing', startDate });

    render(
      <InitiativeActionMenu
        initiative={initiative}
        onEdit={vi.fn()}
        onEndDateChange={onEndDateChange}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /mark as complete/i }));

    const confirmButton = await screen.findByRole('button', { name: /^confirm$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onEndDateChange).toHaveBeenCalledTimes(1);
    });
    const calledWith = onEndDateChange.mock.calls[0][0] as number;
    expect(calledWith).toBeGreaterThanOrEqual(startDate);
  });

  it('does not show Mark as complete when initiative already has an end date', async () => {
    const user = userEvent.setup();
    const initiative = makeInitiative({
      title: 'Ended',
      startDate: DateTime.now().minus({ months: 3 }).startOf('day').toMillis(),
      endDate: DateTime.now().minus({ days: 1 }).endOf('day').toMillis(),
    });

    render(
      <InitiativeActionMenu initiative={initiative} onEdit={vi.fn()} onEndDateChange={vi.fn()} />
    );

    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('menuitem', { name: /mark as complete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /change end date/i })).toBeInTheDocument();
  });
});
