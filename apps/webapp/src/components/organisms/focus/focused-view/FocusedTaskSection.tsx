'use client';

interface FocusedTaskSectionProps {
  title: string;
  count?: number;
  countColorClass?: string;
  countDotColorClass?: string;
  children: React.ReactNode;
}

export function FocusedTaskSection({
  title,
  count,
  countColorClass = 'text-muted-foreground',
  countDotColorClass = 'bg-muted-foreground',
  children,
}: FocusedTaskSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 ${countDotColorClass}`} />
            <span className={`text-[10px] font-bold tabular-nums ${countColorClass}`}>{count}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
