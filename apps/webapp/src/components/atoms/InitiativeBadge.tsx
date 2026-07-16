'use client';

import { getDomainPillColors } from '@/components/atoms/DomainPill/lib/colors';
import { cn } from '@/lib/utils';
import { useIsDarkMode } from '@/modules/theme/ThemeProvider';

interface InitiativeBadgeProps {
  title: string;
  color: string;
  className?: string;
  /** When true, uses muted styling instead of color-based styling. */
  muted?: boolean;
}

/** Compact pill showing initiative title on goal rows, color-coded by sequential palette. */
export function InitiativeBadge({ title, color, className, muted = false }: InitiativeBadgeProps) {
  const isDarkMode = useIsDarkMode();
  const colors = getDomainPillColors(color, isDarkMode);

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        muted && 'bg-muted text-muted-foreground',
        className
      )}
      style={
        muted
          ? undefined
          : {
              color: colors.foreground,
              backgroundColor: colors.background,
            }
      }
      title={title}
    >
      {title}
    </span>
  );
}
