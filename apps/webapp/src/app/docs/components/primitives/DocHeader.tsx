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
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="space-y-4">
      <div
        className={`inline-flex items-center gap-2 px-4 py-1 rounded-full ${badgeColorClasses[badgeColor]} text-sm font-medium`}
      >
        {icon}
        <span>{badge}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="text-lg text-slate-600 max-w-2xl">{description}</p>
    </div>
  );
}
