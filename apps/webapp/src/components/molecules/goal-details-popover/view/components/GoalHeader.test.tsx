import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GoalHeader } from './GoalHeader';

describe('GoalHeader', () => {
  it('renders title as a button and calls onTitleClick when clicked', () => {
    const onTitleClick = vi.fn();

    render(
      <GoalHeader
        title="My Goal"
        isComplete={false}
        onToggleComplete={vi.fn()}
        onTitleClick={onTitleClick}
      />
    );

    const titleButton = screen.getByRole('button', { name: 'My Goal' });
    fireEvent.click(titleButton);

    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it('renders title as heading when onTitleClick is not provided', () => {
    render(<GoalHeader title="Static Goal" isComplete={false} />);

    expect(screen.getByRole('heading', { name: 'Static Goal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Static Goal' })).not.toBeInTheDocument();
  });
});
