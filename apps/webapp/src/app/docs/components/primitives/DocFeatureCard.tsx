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
  const _variantClasses = {
    blue: 'bg-blue-50',
    indigo: 'bg-indigo-50',
    slate: 'bg-slate-100',
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    slate: 'bg-slate-200 text-slate-700',
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClasses[variant]}`}
        >
          {icon}
        </div>
        <h4 className="font-medium text-slate-900">{title}</h4>
      </div>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}
