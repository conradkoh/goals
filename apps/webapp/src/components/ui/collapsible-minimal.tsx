'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import { ChevronsUpDown } from 'lucide-react';

import { buttonVariants } from './button';

import { cn } from '@/lib/utils';

const CollapsibleMinimal = CollapsiblePrimitive.Root;

const CollapsibleMinimalTrigger = ({
  className,
  children,
  showChevron = true,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { showChevron?: boolean }) => (
  <CollapsiblePrimitive.Trigger
    className={cn(
      buttonVariants({ variant: 'ghost', size: 'sm' }),
      'bg-muted rounded-lg px-3 py-2 h-auto w-full text-sm text-muted-foreground hover:text-foreground transition-colors',
      className
    )}
    {...props}
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
  </CollapsiblePrimitive.Trigger>
);

const CollapsibleMinimalContent = ({ className, ...props }: CollapsiblePrimitive.Panel.Props) => (
  <CollapsiblePrimitive.Panel
    className={cn('mt-2 space-y-1 animate-in slide-in-from-top-1 duration-100', className)}
    {...props}
  />
);

export { CollapsibleMinimal, CollapsibleMinimalTrigger, CollapsibleMinimalContent };
