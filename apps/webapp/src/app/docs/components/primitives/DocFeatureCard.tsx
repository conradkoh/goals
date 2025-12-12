import type React from 'react';

interface DocFeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'indigo' | 'slate';
}

export function DocFeatureCard({
  title,
  description,
  icon,
  variant = 'blue',
}: DocFeatureCardProps) {
  const iconClasses = {
    blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
    slate: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="bg-card rounded-lg p-4 border shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClasses[variant]}`}
        >
          {icon}
        </div>
        <h4 className="font-medium text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
