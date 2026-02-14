'use client';

import { XIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { useAllowTouchSelection } from '@/hooks/useAllowTouchSelection';
import { cn } from '@/lib/utils';

interface FixedModalContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FixedModalContext = React.createContext<FixedModalContextValue | undefined>(undefined);

function useFixedModalContext() {
  const context = React.useContext(FixedModalContext);
  if (!context) {
    throw new Error('Fixed modal components must be used within FixedModal');
  }
  return context;
}

interface FixedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Root component for fixed-size modal with portal rendering, backdrop, escape key handler, and body scroll lock.
 * Provides context to child components.
 */
export function FixedModal({ open, onOpenChange, children }: FixedModalProps) {
  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (!open) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open]);

  // Handle escape key
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <FixedModalContext.Provider value={{ open, onOpenChange }}>
      {createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          {/* Modal container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto">{children}</div>
          </div>
        </>,
        document.body
      )}
    </FixedModalContext.Provider>
  );
}

interface FixedModalContentProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Flex column wrapper for header + body. Fixed width on desktop (>50% screen).
 * Provides the main modal card with border and background.
 */
export function FixedModalContent({ className, children }: FixedModalContentProps) {
  // Fix iOS text selection handles
  useAllowTouchSelection();

  return (
    <div
      className={cn(
        'bg-card relative flex max-h-[90vh] w-full max-w-5xl flex-col border-2 border-border/20 shadow-lg animate-in fade-in-0 zoom-in-95',
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

interface FixedModalHeaderProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Header component with close button. Typically contains FixedModalTitle.
 */
export function FixedModalHeader({ className, children }: FixedModalHeaderProps) {
  const { onOpenChange } = useFixedModalContext();

  return (
    <div
      className={cn(
        'border-border/20 flex shrink-0 items-center justify-between border-b px-6 py-4',
        className
      )}
    >
      <div className="flex-1">{children}</div>
      <button
        onClick={() => onOpenChange(false)}
        className="ring-offset-background focus:ring-ring -mr-2 ml-4 shrink-0 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        aria-label="Close"
      >
        <XIcon />
      </button>
    </div>
  );
}

interface FixedModalTitleProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Title element (h2) for modal header.
 */
export function FixedModalTitle({ className, children }: FixedModalTitleProps) {
  return (
    <h2
      className={cn('text-foreground text-lg font-semibold leading-none tracking-tight', className)}
    >
      {children}
    </h2>
  );
}

interface FixedModalBodyProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Scrollable content area. Content scrolls within this container when it exceeds the modal height.
 */
export function FixedModalBody({ className, children }: FixedModalBodyProps) {
  return (
    <div className={cn('text-foreground flex-1 overflow-y-auto px-6 py-4', className)}>
      {children}
    </div>
  );
}

interface FixedModalSidebarProps {
  className?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
}

/**
 * Optional sidebar component that can be placed on the left or right side of the modal.
 * When used with FixedModalContent, wrap both in a flex container.
 */
export function FixedModalSidebar({ className, children, side = 'left' }: FixedModalSidebarProps) {
  return (
    <div
      className={cn(
        'bg-muted/50 border-border/20 flex shrink-0 flex-col',
        side === 'left' ? 'border-r' : 'border-l',
        className
      )}
    >
      {children}
    </div>
  );
}
