import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GoalLogCreateForm } from './GoalLogCreateForm';

// jsdom cannot load the editor CSS module; only the collapsed trigger is under test here.
vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => html.replace(/<[^>]*>/g, '').trim() === '',
  stripTrailingEmptyParagraphs: (html: string) => html,
  RichTextEditor: () => null,
}));

describe('GoalLogCreateForm collapsed trigger', () => {
  it('uses the default disabled label', () => {
    render(
      <GoalLogCreateForm onSubmit={vi.fn()} expanded={false} onExpandedChange={vi.fn()} disabled />
    );
    expect(
      screen.getByRole('button', { name: 'Switch to current view to add entries' })
    ).toBeInTheDocument();
  });

  it('uses a custom disabled label', () => {
    render(
      <GoalLogCreateForm
        onSubmit={vi.fn()}
        expanded={false}
        onExpandedChange={vi.fn()}
        disabled
        disabledLabel="Finish editing to add entries"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Finish editing to add entries' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Switch to current view to add entries' })
    ).not.toBeInTheDocument();
  });

  it('forwards triggerRef to the collapsed Add log entry button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <GoalLogCreateForm
        onSubmit={vi.fn()}
        expanded={false}
        onExpandedChange={vi.fn()}
        triggerRef={ref}
      />
    );

    const button = screen.getByRole('button', { name: /add log entry/i });
    expect(ref.current).toBe(button);
    expect(ref.current?.textContent).toContain('Add log entry...');
  });

  it('renders no editor while disabled, even when expanded', () => {
    render(<GoalLogCreateForm onSubmit={vi.fn()} expanded onExpandedChange={vi.fn()} disabled />);

    expect(screen.queryByRole('button', { name: 'Add Entry' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch to current view to add entries' })
    ).toBeDisabled();
  });

  it('expands only when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <GoalLogCreateForm onSubmit={vi.fn()} expanded={false} onExpandedChange={onExpandedChange} />
    );

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
