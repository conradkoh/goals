import { fireEvent, render, screen } from '@testing-library/react';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { InitiativeSelector } from './InitiativeSelector';

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
});

const initiatives = [
  {
    _id: 'initiatives:alpha' as Id<'initiatives'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    title: 'Q1 Launch',
    startDate: 1_700_000_000_000,
    description: undefined,
    endDate: undefined,
  },
] as Doc<'initiatives'>[];

describe('InitiativeSelector', () => {
  it('allows focusing the search input when the combobox is open', () => {
    render(
      <InitiativeSelector
        initiatives={initiatives}
        selectedInitiativeId={null}
        onInitiativeChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    const search = screen.getByPlaceholderText('Search initiatives...');
    expect(search).toBeInTheDocument();

    search.focus();
    expect(document.activeElement).toBe(search);
  });

  it('keeps combobox content in the same DOM tree as the trigger (unportalled)', () => {
    const { container } = render(
      <div data-testid="host">
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiativeId={null}
          onInitiativeChange={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByRole('combobox'));

    const host = screen.getByTestId('host');
    const search = screen.getByPlaceholderText('Search initiatives...');
    // Unportalled content must remain under the host (not only under document.body via Portal)
    expect(host.contains(search)).toBe(true);
    expect(container.contains(search)).toBe(true);
  });
});
