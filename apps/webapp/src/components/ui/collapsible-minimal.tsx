'use client';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

const CollapsibleMinimal = CollapsiblePrimitive.Root;

const CollapsibleMinimalTrigger = ({
  className,
  children,
  showChevron = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
  showChevron?: boolean;
}) => (
  <CollapsiblePrimitive.Trigger asChild {...props}>
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'bg-muted rounded-lg px-3 py-2 h-auto w-full text-sm text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
    >
      {typeof children === 'string' ? (
        <div className="flex justify-between w-full">
          <span>{children}</span>
          {showChevron && <ChevronsUpDown className="h-3 w-3" />}
        </div>
      ) : (
        <>
          {children}
          {showChevron && <ChevronsUpDown className="h-3 w-3 ml-2" />}
        </>
      )}
    </Button>
  </CollapsiblePrimitive.Trigger>
);

const CollapsibleMinimalContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>) => (
  <CollapsiblePrimitive.Content
    className={cn('mt-2 space-y-1 animate-in slide-in-from-top-1 duration-100', className)}
    {...props}
  />
);

export { CollapsibleMinimal, CollapsibleMinimalTrigger, CollapsibleMinimalContent };
