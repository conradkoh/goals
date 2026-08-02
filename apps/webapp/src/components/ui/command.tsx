'use client';

import { SearchIcon } from 'lucide-react';
import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ItemId = string;

interface CommandItemRegistration {
  id: ItemId;
  value: string;
  disabled: boolean;
  groupId?: string;
  onSelect?: (value: string) => void;
  element: HTMLElement | null;
}

interface CommandContextValue {
  search: string;
  setSearch: (value: string) => void;
  shouldFilter: boolean;
  items: CommandItemRegistration[];
  visibleItems: CommandItemRegistration[];
  selectedId: ItemId | null;
  setSelectedId: (id: ItemId | null) => void;
  selectItem: (id: ItemId) => void;
  registerItem: (item: CommandItemRegistration) => () => void;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);

function useCommandContext() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error('Command components must be used within a <Command>');
  }
  return context;
}

/**
 * Default command filter: splits the search query on whitespace and requires
 * every word to appear as a case-insensitive substring of the item value.
 */
export function defaultFilter(search: string, value: string): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const haystack = value.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Root command menu component that provides a styled container for command palette UIs.
 * Manages search state, item registration, and keyboard-selection state for children.
 *
 * @public
 *
 * @example
 * ```tsx
 * <Command>
 *   <CommandInput placeholder="Type a command..." />
 *   <CommandList>
 *     <CommandGroup heading="Actions">
 *       <CommandItem>Create new goal</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 * ```
 */
function Command({
  shouldFilter = true,
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /** Whether to filter items by the search query. Disable when items are pre-filtered externally. */
  shouldFilter?: boolean;
}) {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<CommandItemRegistration[]>([]);
  const [selectedId, setSelectedId] = React.useState<ItemId | null>(null);

  const registerItem = React.useCallback((item: CommandItemRegistration) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (!existing) {
        return [...prev, item];
      }
      return prev.map((i) => (i.id === item.id ? item : i));
    });
    return () => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    };
  }, []);

  const selectItem = React.useCallback(
    (id: ItemId) => {
      const item = items.find((i) => i.id === id);
      if (item && !item.disabled) {
        item.onSelect?.(item.value);
      }
    },
    [items]
  );

  const visibleItems = React.useMemo(() => {
    if (!shouldFilter) {
      return items;
    }
    return items.filter((item) => defaultFilter(search, item.value));
  }, [items, search, shouldFilter]);

  const contextValue = React.useMemo<CommandContextValue>(
    () => ({
      search,
      setSearch,
      shouldFilter,
      items,
      visibleItems,
      selectedId,
      setSelectedId,
      selectItem,
      registerItem,
    }),
    [search, shouldFilter, items, visibleItems, selectedId, selectItem, registerItem]
  );

  return (
    <CommandContext.Provider value={contextValue}>
      <div
        data-slot="command"
        className={cn(
          'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

/**
 * Dialog wrapper for command palettes. Provides a modal dialog with command menu inside.
 * Includes screen reader accessible title and description.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
 *   <CommandInput placeholder="Search..." />
 *   <CommandList>
 *     <CommandGroup heading="Suggestions">
 *       <CommandItem>Calendar</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandDialog>
 * ```
 */
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  shouldFilter = true,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  title?: string;
  description?: string;
  className?: string;
  shouldFilter?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn('overflow-hidden p-0', className)}>
        <Command
          shouldFilter={shouldFilter}
          className="[&_[data-slot=command-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-group]:not([hidden])_~[data-slot=command-group]]:pt-0 [&_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=command-input-wrapper]_svg]:w-5 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:h-5 [&_[data-slot=command-item]_svg]:w-5"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Text input component for command palette search.
 * Supports ref forwarding for programmatic focus control.
 *
 * @public
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 *
 * <CommandInput
 *   ref={inputRef}
 *   placeholder="Type to search..."
 *   value={searchValue}
 *   onValueChange={setSearchValue}
 * />
 * ```
 */
const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, value, onValueChange, onKeyDown, ...props }, ref) => {
    const { search, setSearch, visibleItems, selectedId, setSelectedId, selectItem } =
      useCommandContext();

    const isControlled = value !== undefined;
    const inputValue = isControlled ? value : search;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setSearch(nextValue);
      onValueChange?.(nextValue);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }
      const currentIndex = selectedId
        ? visibleItems.findIndex((item) => item.id === selectedId)
        : -1;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentIndex + 1;
        if (nextIndex < visibleItems.length) {
          setSelectedId(visibleItems[nextIndex].id);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          setSelectedId(visibleItems[prevIndex].id);
        }
      } else if (event.key === 'Enter' && selectedId) {
        event.preventDefault();
        selectItem(selectedId);
      }
    };

    return (
      <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <input
          ref={ref}
          data-slot="command-input"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CommandInput.displayName = 'CommandInput';

interface CommandInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value?: string;
  onValueChange?: (value: string) => void;
}

/**
 * Scrollable container for command items. Automatically manages overflow.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandEmpty>No results found.</CommandEmpty>
 *   <CommandGroup heading="Suggestions">
 *     <CommandItem>Item 1</CommandItem>
 *     <CommandItem>Item 2</CommandItem>
 *   </CommandGroup>
 * </CommandList>
 * ```
 */
function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-list"
      className={cn('h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  );
}

/**
 * Empty state component shown when no command items match the search.
 * Renders nothing while at least one item is visible.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandEmpty>
 *     <p>No results found for "{searchQuery}"</p>
 *   </CommandEmpty>
 *   <CommandGroup>...</CommandGroup>
 * </CommandList>
 * ```
 */
function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { visibleItems } = useCommandContext();

  if (visibleItems.length > 0) {
    return null;
  }
  return (
    <div
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm', className)}
      {...props}
    />
  );
}

/**
 * Groups related command items together under an optional heading.
 * Hides itself when all of its items are filtered out by the search.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandGroup heading="Navigation">
 *   <CommandItem>Go to Dashboard</CommandItem>
 *   <CommandItem>Go to Settings</CommandItem>
 * </CommandGroup>
 * <CommandGroup heading="Actions">
 *   <CommandItem>Create Goal</CommandItem>
 * </CommandGroup>
 * ```
 */
function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  heading?: React.ReactNode;
}) {
  const { items, visibleItems } = useCommandContext();
  const groupId = React.useId();
  const groupRef = React.useRef<HTMLDivElement>(null);

  const hasVisibleItems = React.useMemo(() => {
    const groupItems = items.filter((item) => item.groupId === groupId);
    if (groupItems.length === 0) {
      return true;
    }
    return visibleItems.some((item) => item.groupId === groupId);
  }, [items, visibleItems, groupId]);

  // Reflect filtered-out groups as hidden so sibling-group spacing CSS applies.
  React.useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.hidden = !hasVisibleItems;
    }
  }, [hasVisibleItems]);

  return (
    <CommandGroupContext.Provider value={groupId}>
      <div
        ref={groupRef}
        data-slot="command-group"
        className={cn(
          'text-foreground [&_[data-slot=command-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium',
          className
        )}
        {...props}
      >
        {heading ? <div data-slot="command-group-heading">{heading}</div> : null}
        {children}
      </div>
    </CommandGroupContext.Provider>
  );
}

const CommandGroupContext = React.createContext<string | null>(null);

function useCommandGroupId() {
  return React.useContext(CommandGroupContext);
}

/**
 * Visual separator between command groups.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandGroup heading="Recent">
 *   <CommandItem>Recent Goal 1</CommandItem>
 * </CommandGroup>
 * <CommandSeparator />
 * <CommandGroup heading="All Goals">
 *   <CommandItem>Goal A</CommandItem>
 * </CommandGroup>
 * ```
 */
function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-separator"
      role="separator"
      className={cn('bg-border -mx-1 h-px', className)}
      {...props}
    />
  );
}

/**
 * Individual selectable item within a command palette.
 * Supports keyboard navigation and click interaction.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandItem onSelect={() => handleAction('create')}>
 *   <Plus className="mr-2" />
 *   Create new goal
 *   <CommandShortcut>⌘N</CommandShortcut>
 * </CommandItem>
 * ```
 */
function CommandItem({
  className,
  value,
  disabled = false,
  onSelect,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}) {
  const { search, shouldFilter, registerItem, selectedId, setSelectedId, selectItem } =
    useCommandContext();
  const groupId = useCommandGroupId();
  const id = React.useId();
  const itemRef = React.useRef<HTMLDivElement>(null);
  const [resolvedValue, setResolvedValue] = React.useState(value ?? '');

  React.useLayoutEffect(() => {
    // cmdk derives the item value from its text content when no explicit value is given.
    const nextValue = value ?? itemRef.current?.textContent?.trim() ?? '';
    setResolvedValue(nextValue);
    return registerItem({
      id,
      value: nextValue,
      disabled,
      groupId: groupId ?? undefined,
      onSelect,
      element: itemRef.current,
    });
  }, [registerItem, id, value, disabled, groupId, onSelect]);

  const isSelected = selectedId === id;
  const isFilteredOut = shouldFilter && !defaultFilter(search, resolvedValue);
  const hidden = isFilteredOut || undefined;

  // Scroll the selected item into view when selection changes via keyboard.
  React.useLayoutEffect(() => {
    if (isSelected && itemRef.current?.scrollIntoView) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={itemRef}
      data-slot="command-item"
      data-selected={isSelected ? true : undefined}
      data-disabled={disabled ? true : undefined}
      hidden={hidden}
      role="option"
      aria-selected={isSelected}
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onMouseEnter={() => {
        if (!disabled) {
          setSelectedId(id);
        }
      }}
      onClick={() => {
        selectItem(id);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Displays keyboard shortcut hints for command items.
 * Automatically positioned at the right edge of items.
 *
 * @public
 *
 * @example
 * ```tsx
 * <CommandItem>
 *   Save document
 *   <CommandShortcut>⌘S</CommandShortcut>
 * </CommandItem>
 * ```
 */
function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
