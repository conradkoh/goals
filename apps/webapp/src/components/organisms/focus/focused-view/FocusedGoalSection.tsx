'use client';

interface FocusedGoalSectionProps {
  title: string;
  count?: number;
  countColorClass?: string;
  countDotColorClass?: string;
  children: React.ReactNode;
}

export function FocusedGoalSection({
  title,
  count,
  countColorClass = 'text-muted-foreground',
  countDotColorClass = 'bg-muted-foreground',
  children,
}: FocusedGoalSectionProps) {
  // Map countDotColorClass to corresponding background for badge
  const badgeBgClass =
    countDotColorClass === 'bg-red-400'
      ? 'bg-red-400/10'
      : countDotColorClass === 'bg-amber-400'
        ? 'bg-amber-400/10'
        : 'bg-muted-foreground/10';

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
        {count !== undefined && count > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${badgeBgClass}`}
          >
            <span className={`w-1 h-1 rounded-full ${countDotColorClass}`} />
            <span className={`text-[10px] font-bold tabular-nums ${countColorClass}`}>{count}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
