/**
 * @file Pure UI component for domain pills
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  NOTE: Consider using `DomainPill` instead                                ║
 * ║                                                                           ║
 * ║  This is the pure UI component without popover functionality.             ║
 * ║  For most use cases, import `DomainPill` from the parent directory        ║
 * ║  which includes integrated popover for viewing/managing domain tasks.     ║
 * ║                                                                           ║
 * ║  Only use `DomainPillView` directly when:                                 ║
 * ║  - You need a custom trigger composition (e.g., wrapping with Radix)      ║
 * ║  - You explicitly need a non-interactive, display-only pill               ║
 * ║  - You're building a custom popover/dialog wrapper                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { forwardRef } from 'react';

import { getDomainPillColors } from '../lib/colors';

import { cn } from '@/lib/utils';
import { useIsDarkMode } from '@/modules/theme/ThemeProvider';

export interface DomainPillViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The display name of the domain */
  domainName: string;
  /** The color of the domain (hex string) */
  domainColor?: string;
  /** Optional count to display in parentheses */
  count?: number;
  /** Whether the pill should appear interactive (clickable) */
  interactive?: boolean;
}

/**
 * Pure UI layer for the domain pill.
 * Renders a colored pill with optional count indicator.
 *
 * @see DomainPill - The recommended component with integrated popover functionality.
 *
 * Use this component directly only when you need just the visual without
 * popover functionality, or when composing with custom triggers.
 *
 * Supports all standard div attributes (onClick, aria-*, data-*, etc.) for
 * compatibility with Radix UI triggers and other composition patterns.
 */
export const DomainPillView = forwardRef<HTMLDivElement, DomainPillViewProps>(
  ({ domainName, domainColor, count, interactive = false, className, style, ...props }, ref) => {
    const isDarkMode = useIsDarkMode();
    const colors = getDomainPillColors(domainColor, isDarkMode);

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          interactive && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        style={{
          color: colors.foreground,
          backgroundColor: colors.background,
          borderColor: colors.border,
          ...style,
        }}
        {...props}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.dotColor }}
        />
        <span className="truncate">
          {domainName}
          {count !== undefined && ` (${count})`}
        </span>
      </div>
    );
  }
);

DomainPillView.displayName = 'DomainPillView';
