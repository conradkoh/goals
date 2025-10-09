'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
/**
 * Props for the Label component extending Radix UI Label with variant support.
 *
 * @example
 * ```typescript
 * <Label htmlFor="email" className="text-blue-600">
 *   Email Address
 * </Label>
 * ```
 */
export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof _labelVariants> {}

/**
 * CSS class variants for the label component styling.
 * Provides consistent typography and disabled state handling.
 */
const _labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);
/**
 * Accessible label component built on Radix UI Label primitive.
 * Provides consistent styling and proper accessibility attributes for form labels.
 * Automatically handles disabled state styling when associated input is disabled.
 *
 * @param props - Label props including standard HTML label attributes and variant props
 * @param ref - Forwarded ref to the underlying label element
 * @returns JSX element representing the styled label
 *
 * @example
 * ```typescript
 * // Basic usage
 * <Label htmlFor="username">Username</Label>
 *
 * // With custom styling
 * <Label htmlFor="email" className="text-blue-600 font-bold">
 *   Email Address
 * </Label>
 *
 * // With form association
 * <div>
 *   <Label htmlFor="password">Password</Label>
 *   <Input id="password" type="password" />
 * </div>
 * ```
 */
export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn(_labelVariants(), className)} {...props} />
  )
);
Label.displayName = LabelPrimitive.Root.displayName;
