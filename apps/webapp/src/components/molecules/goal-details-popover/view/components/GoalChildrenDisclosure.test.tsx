import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GoalChildrenDisclosure } from './GoalChildrenDisclosure';

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

    const heading = screen.getByRole('heading', { name: /Weekly Goals/ });
    const trigger = screen.getByRole('button', { name: /Weekly Goals/ });
    expect(heading).toContainElement(trigger);
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
