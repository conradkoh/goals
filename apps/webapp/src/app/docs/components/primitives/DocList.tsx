import type React from 'react';

interface DocListItemProps {
  children: React.ReactNode;
  variant?: 'blue' | 'indigo' | 'slate';
}

export function DocListItem({ children, variant = 'blue' }: DocListItemProps) {
  const variantClasses = {
    blue: 'bg-blue-100 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
    slate: 'bg-muted border-border',
  };

  const dotClasses = {
    blue: 'bg-blue-700 dark:bg-blue-400',
    indigo: 'bg-indigo-700 dark:bg-indigo-400',
    slate: 'bg-muted-foreground',
  };

  return (
    <li className="flex items-start gap-2">
      <div className={`rounded-full ${variantClasses[variant]} p-1 mt-0.5`}>
        <div className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />
      </div>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

interface DocListProps {
  children: React.ReactNode;
  className?: string;
}

export function DocList({ children, className = '' }: DocListProps) {
  return <ul className={`text-sm space-y-2 ${className}`}>{children}</ul>;
}
