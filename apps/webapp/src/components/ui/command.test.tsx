import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  defaultFilter,
} from './command';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('defaultFilter', () => {
  it('matches when every whitespace-separated word is a substring of value', () => {
    expect(defaultFilter('new goal', 'New Weekly Goal')).toBe(true);
    expect(defaultFilter('new goal', 'NEW weekly GOAL')).toBe(true);
    expect(defaultFilter('quarterly q1', 'Q1 Quarterly Goal')).toBe(true);
  });

  it('rejects when any word is missing from the value', () => {
    expect(defaultFilter('new goal', 'Weekly Goal')).toBe(false);
    expect(defaultFilter('quarterly q1', 'Q2 Quarterly Goal')).toBe(false);
  });

  it('matches everything for empty/whitespace search', () => {
    expect(defaultFilter('', 'Anything')).toBe(true);
    expect(defaultFilter('   ', 'Anything')).toBe(true);
  });
});

function renderCommand(shouldFilter?: boolean) {
  const onSelect = vi.fn();
  render(
    <Command shouldFilter={shouldFilter}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Results">
          <CommandItem value="alpha goal" onSelect={onSelect}>
            Alpha Goal
          </CommandItem>
          <CommandItem value="beta goal" onSelect={onSelect}>
            Beta Goal
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
  return { onSelect };
}

describe('Command', () => {
  it('shows CommandEmpty when no items match the search', async () => {
    renderCommand();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('hides CommandEmpty while items are visible', async () => {
    renderCommand();
    await waitFor(() => {
      expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    });
  });

  it('filters items by the search query', async () => {
    renderCommand();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'alpha' } });
    await waitFor(() => {
      expect(screen.getByText('Alpha Goal').closest('[data-slot=command-item]')).toBeVisible();
      expect(screen.getByText('Beta Goal').closest('[data-slot=command-item]')).not.toBeVisible();
    });
  });

  it('selects the next item with ArrowDown', async () => {
    renderCommand();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByText('Alpha Goal').closest('[data-slot=command-item]')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByText('Beta Goal').closest('[data-slot=command-item]')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });
  });

  it('selects the previous item with ArrowUp', async () => {
    renderCommand();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByText('Alpha Goal').closest('[data-slot=command-item]')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });
  });

  it('fires onSelect with the item value on Enter', async () => {
    const { onSelect } = renderCommand();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('alpha goal');
    });
  });

  it('fires onSelect when an item is clicked', async () => {
    const { onSelect } = renderCommand();
    const alpha = await screen.findByText('Alpha Goal');
    const item = alpha.closest('[data-slot=command-item]');
    expect(item).not.toBeNull();
    fireEvent.click(item as HTMLElement);
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('alpha goal');
    });
  });

  it('does not filter when shouldFilter is false', async () => {
    renderCommand(false);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => {
      expect(screen.getByText('Alpha Goal')).toBeInTheDocument();
      expect(screen.getByText('Beta Goal')).toBeInTheDocument();
    });
  });
});
