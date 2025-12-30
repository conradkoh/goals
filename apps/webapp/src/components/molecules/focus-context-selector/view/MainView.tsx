import type { ReactElement, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Main view component for focus context selector modal.
 * Provides a consistent dialog shell with header, content, and optional footer.
 *
 * @example
 * ```tsx
 * <MainView
 *   open={isOpen}
 *   onOpenChange={setOpen}
 *   title="Select Quarter"
 *   description="Choose the year and quarter to view"
 *   onApply={handleApply}
 *   onCancel={handleCancel}
 * >
 *   <QuarterSelector value={1} onChange={(q) => setQuarter(q)} />
 * </MainView>
 * ```
 */
export interface MainViewProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Optional dialog description */
  description?: string;
  /** Dialog content */
  children: ReactNode;
  /** Callback when Apply button is clicked */
  onApply?: () => void;
  /** Callback when Cancel button is clicked (defaults to closing dialog) */
  onCancel?: () => void;
  /** Label for the Apply button */
  applyLabel?: string;
  /** Label for the Cancel button */
  cancelLabel?: string;
}

export function MainView({
  open,
  onOpenChange,
  title,
  description,
  children,
  onApply,
  onCancel,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
}: MainViewProps): ReactElement {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleApply = () => {
    onApply?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-4">{children}</div>
        {onApply && (
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button onClick={handleApply}>{applyLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
