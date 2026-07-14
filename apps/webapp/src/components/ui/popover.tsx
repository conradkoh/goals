'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * V2 Industrial Design System - Popover Component
 *
 * Features:
 * - Sharp corners (no border-radius)
 * - 2px border
 * - Glassmorphism with backdrop-blur
 */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  /**
   * When false, content is not portalled. Use inside Dialog/AlertDialog so Safari
   * can focus nested inputs (e.g. combobox search). Default keeps portal behavior.
   */
  portalled = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalled?: boolean;
}) {
  const content = (
    <PopoverPrimitive.Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover/95 backdrop-blur-sm text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) border-2 border-border/20 p-4 shadow-md outline-hidden',
        className
      )}
      {...props}
    />
  );

  if (!portalled) {
    return content;
  }

  return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
