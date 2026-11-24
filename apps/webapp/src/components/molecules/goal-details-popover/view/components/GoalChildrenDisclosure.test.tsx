import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { formatChildSummary, GoalChildrenDisclosure } from './GoalChildrenDisclosure';

describe('formatChildSummary', () => {
  it('uses the singular noun for a count of one', () => {
    expect(formatChildSummary({ count: 1, singular: 'weekly goal', plural: 'weekly goals' })).toBe(
      '1 weekly goal'
    );
  });

  it('uses the plural noun for a count greater than one', () => {
    expect(formatChildSummary({ count: 5, singular: 'weekly goal', plural: 'weekly goals' })).toBe(
      '5 weekly goals'
    );
  });

  it('formats daily goals', () => {
    expect(formatChildSummary({ count: 3, singular: 'daily goal', plural: 'daily goals' })).toBe(
      '3 daily goals'
    );
  });

  it('formats sub-tasks', () => {
    expect(formatChildSummary({ count: 4, singular: 'sub-task', plural: 'sub-tasks' })).toBe(
      '4 sub-tasks'
    );
  });

  it('joins the secondary phrase with a middle dot', () => {
    expect(
      formatChildSummary(
        { count: 5, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 12, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('5 weekly goals · 12 daily goals');
  });

  it('omits a secondary phrase with a count of zero', () => {
    expect(
      formatChildSummary(
        { count: 5, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 0, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('5 weekly goals');
  });

  it('uses singular nouns on both sides for single counts', () => {
    expect(
      formatChildSummary(
        { count: 1, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 1, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('1 weekly goal · 1 daily goal');
  });
});

describe('GoalChildrenDisclosure', () => {
  function renderDisclosure(
    children = (
      <ul>
        <li>Alpha goal</li>
        <li>Beta goal</li>
      </ul>
    )
  ) {
    return render(
      <GoalChildrenDisclosure title="Weekly Goals" summary="2 weekly goals">
        {children}
      </GoalChildrenDisclosure>
    );
  }

  it('is collapsed by default and keeps children in the document but hidden', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('2 weekly goals');
    expect(screen.getByText('Alpha goal')).toBeInTheDocument();
    expect(screen.getByText('Alpha goal')).not.toBeVisible();
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Alpha goal')).toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    trigger.focus();

    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps a draft child input value across collapse and expand', async () => {
    const user = userEvent.setup();
    renderDisclosure(<input aria-label="Child draft" />);

    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    await user.click(trigger);
    await user.type(screen.getByLabelText('Child draft'), 'half-written');
    await user.click(trigger);
    await user.click(trigger);

    expect(screen.getByLabelText('Child draft')).toHaveValue('half-written');
  });
});
