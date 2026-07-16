'use client';

import { getDomainPillColors } from '@/components/atoms/DomainPill/lib/colors';
import { getInitiativeColorFromTitle } from '@/lib/initiative/initiative-color';
import { cn } from '@/lib/utils';
import { useIsDarkMode } from '@/modules/theme/ThemeProvider';

interface InitiativeBadgeProps {
  title: string;
  className?: string;
  /** When true, uses muted styling instead of title-based color. */
  muted?: boolean;
}

/** Compact pill showing initiative title on goal rows, color-coded by title. */
export function InitiativeBadge({ title, className, muted = false }: InitiativeBadgeProps) {
  const isDarkMode = useIsDarkMode();
  const initiativeColor = getInitiativeColorFromTitle(title);
  const colors = getDomainPillColors(initiativeColor, isDarkMode);

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
