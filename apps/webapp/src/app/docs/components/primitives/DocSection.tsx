import type React from 'react';

interface DocSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'neutral';
}

export function DocSection({ title, icon, children, variant = 'primary' }: DocSectionProps) {
  const headerVariants = {
    primary: 'bg-blue-600 dark:bg-blue-700',
    secondary: 'bg-indigo-600 dark:bg-indigo-700',
    neutral: 'bg-muted-foreground',
  };

  return (
    <section>
      <div className="overflow-hidden rounded-lg border-none shadow-md">
        <div className={`${headerVariants[variant]} px-6 py-4`}>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
        </div>
        <div className="bg-card p-6">{children}</div>
      </div>
    </section>
  );
}
