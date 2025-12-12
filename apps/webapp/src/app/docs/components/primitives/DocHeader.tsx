import type React from 'react';

interface DocHeaderProps {
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  badgeColor?: 'blue' | 'indigo' | 'slate';
}

export function DocHeader({
  icon,
  badge,
  title,
  description,
  badgeColor = 'blue',
}: DocHeaderProps) {
  const badgeColorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400',
    slate: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-4">
      <div
        className={`inline-flex items-center gap-2 px-4 py-1 rounded-full ${badgeColorClasses[badgeColor]} text-sm font-medium`}
      >
        {icon}
        <span>{badge}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl">{description}</p>
    </div>
  );
}
