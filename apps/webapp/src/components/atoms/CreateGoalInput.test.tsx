import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateGoalInput } from './CreateGoalInput';

describe('CreateGoalInput', () => {
  it('does not render editing border when children are all falsy', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateGoalInput placeholder="Add a task…" value="" onChange={vi.fn()} onSubmit={vi.fn()}>
        {false}
        {false}
      </CreateGoalInput>
    );

    await user.click(screen.getByPlaceholderText('Add a task…'));

    expect(container.querySelector('.border-t')).not.toBeInTheDocument();
  });

  it('renders editing border when real children exist', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateGoalInput placeholder="Add a goal…" value="" onChange={vi.fn()} onSubmit={vi.fn()}>
        <div data-testid="child">Child</div>
      </CreateGoalInput>
    );

    await user.click(screen.getByPlaceholderText('Add a goal…'));

    expect(container.querySelector('.border-t')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
