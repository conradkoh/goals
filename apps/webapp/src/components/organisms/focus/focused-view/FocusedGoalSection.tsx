'use client';

import type { ReactNode } from 'react';

export type FocusedGoalSectionTone = 'muted' | 'urgent';

const toneStyles: Record<FocusedGoalSectionTone, { badge: string; dot: string; text: string }> = {
  muted: {
    badge: 'bg-muted/60',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
  urgent: {
    badge: 'bg-red-50 dark:bg-red-950/20',
    dot: 'bg-red-500 dark:bg-red-400',
    text: 'text-red-800 dark:text-red-400',
  },
};

interface FocusedGoalSectionProps {
  title: string;
  description?: string;
  count?: number;
  tone?: FocusedGoalSectionTone;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function FocusedGoalSection({
  title,
  description,
  count,
  tone = 'muted',
  icon,
  action,
  children,
}: FocusedGoalSectionProps) {
  const styles = toneStyles[tone];

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border">
        {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
          {description && (
            <p className="text-[10px] leading-4 text-muted-foreground">{description}</p>
          )}
        </div>
        {count !== undefined && (
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-full ${styles.badge}`}
          >
            <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
            <span className={`text-[10px] font-bold tabular-nums ${styles.text}`}>{count}</span>
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}
