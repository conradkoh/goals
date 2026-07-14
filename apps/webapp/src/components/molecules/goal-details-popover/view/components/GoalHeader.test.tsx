import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GoalHeader } from './GoalHeader';

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

describe('GoalHeader', () => {
  it('renders title as a button and enters edit mode on click', () => {
    const onTitleSave = vi.fn();

    render(
      <GoalHeader
        title="My Goal"
        isComplete={false}
        onToggleComplete={vi.fn()}
        onTitleSave={onTitleSave}
      />
    );

    const titleButton = screen.getByRole('button', { name: 'My Goal' });
    fireEvent.click(titleButton);

    expect(screen.getByDisplayValue('My Goal')).toBeInTheDocument();
  });

  it('saves on Enter with trimmed value', () => {
    const onTitleSave = vi.fn();

    render(
      <GoalHeader
        title="My Goal"
        isComplete={false}
        onToggleComplete={vi.fn()}
        onTitleSave={onTitleSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'My Goal' }));
    const input = screen.getByDisplayValue('My Goal');
    fireEvent.change(input, { target: { value: 'Updated Goal' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTitleSave).toHaveBeenCalledWith('Updated Goal');
  });

  it('cancels on Escape and restores title', () => {
    const onTitleSave = vi.fn();

    render(
      <GoalHeader
        title="My Goal"
        isComplete={false}
        onToggleComplete={vi.fn()}
        onTitleSave={onTitleSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'My Goal' }));
    const input = screen.getByDisplayValue('My Goal');
    fireEvent.change(input, { target: { value: 'Updated Goal' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onTitleSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'My Goal' })).toBeInTheDocument();
  });

  it('does not save when Escape is followed by blur', () => {
    const onTitleSave = vi.fn();

    render(
      <GoalHeader
        title="My Goal"
        isComplete={false}
        onToggleComplete={vi.fn()}
        onTitleSave={onTitleSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'My Goal' }));
    const input = screen.getByDisplayValue('My Goal');
    fireEvent.change(input, { target: { value: 'Updated Goal' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(onTitleSave).not.toHaveBeenCalled();
  });

  it('renders title as heading when onTitleSave is not provided', () => {
    render(<GoalHeader title="Static Goal" isComplete={false} />);

    expect(screen.getByRole('heading', { name: 'Static Goal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Static Goal' })).not.toBeInTheDocument();
  });
});
