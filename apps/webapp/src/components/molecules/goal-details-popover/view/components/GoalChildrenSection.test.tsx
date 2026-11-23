import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GoalChildrenSection } from './GoalChildrenSection';

describe('GoalChildrenSection', () => {
  it('shows the title heading and hint when there are no children', () => {
    render(
      <GoalChildrenSection title="Weekly Goals" createInput={<input aria-label="New goal" />} />
    );

    expect(screen.getByRole('heading', { name: 'Weekly Goals' })).toBeInTheDocument();
    expect(screen.getByText('No weekly goals yet')).toBeInTheDocument();
    expect(screen.getByLabelText('New goal')).toBeInTheDocument();
  });

  it('derives the hint from the title', () => {
    render(
      <GoalChildrenSection title="Daily Goals" createInput={<input aria-label="New goal" />} />
    );

    expect(screen.getByText('No daily goals yet')).toBeInTheDocument();
  });

  it('adds no heading when a children list is supplied', () => {
    render(
      <GoalChildrenSection
        title="Weekly Goals"
        childrenList={<div>list-row</div>}
        createInput={<input aria-label="New goal" />}
      />
    );

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText(/^No .* yet$/)).toBeNull();
    expect(screen.getByText('list-row')).toBeInTheDocument();
  });

  it('renders nothing when there is no list and no create input', () => {
    const { container } = render(<GoalChildrenSection title="Weekly Goals" />);

    expect(container.firstChild).toBeNull();
  });

  it('shows its separator by default and hides it on request', () => {
    const childrenList = <div>list-row</div>;

    const { container, unmount } = render(
      <GoalChildrenSection title="Weekly Goals" childrenList={childrenList} />
    );
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull();
    unmount();

    const { container: noSeparator } = render(
      <GoalChildrenSection title="Weekly Goals" childrenList={childrenList} showSeparator={false} />
    );
    expect(noSeparator.querySelector('[data-slot="separator"]')).toBeNull();
  });
});
