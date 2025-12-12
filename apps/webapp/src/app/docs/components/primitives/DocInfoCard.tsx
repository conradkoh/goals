import type React from 'react';

interface DocInfoCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'note' | 'warning';
}

export function DocInfoCard({ children, variant = 'default' }: DocInfoCardProps) {
  const variantClasses = {
    default: 'bg-muted border-border',
    note: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  };

  const textClasses = {
    default: 'text-muted-foreground',
    note: 'text-blue-800 dark:text-blue-400',
    warning: 'text-amber-800 dark:text-amber-400',
  };

  return (
    <div className={`rounded-lg ${variantClasses[variant]} p-5 border`}>
      <div className={`text-sm ${textClasses[variant]}`}>{children}</div>
    </div>
  );
}
