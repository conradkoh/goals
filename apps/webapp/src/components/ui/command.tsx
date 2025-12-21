'use client';

import { Command as CommandPrimitive } from 'cmdk';
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

/**
 * Root command menu component that provides a styled container for command palette UIs.
 * Wraps the cmdk Command primitive with consistent styling.
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
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
        className
      )}
      {...props}
    />
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
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn('overflow-hidden p-0', className)}>
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
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
const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => {
  return (
    <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        ref={ref}
        data-slot="command-input"
        className={cn(
          'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = CommandPrimitive.Input.displayName;

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
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  );
}

/**
 * Empty state component shown when no command items match the search.
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
function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  );
}

/**
 * Groups related command items together under an optional heading.
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
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className
      )}
      {...props}
    />
  );
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
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
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
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
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
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
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
