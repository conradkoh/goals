import React from 'react';

interface DocInfoCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'note' | 'warning';
}

export function DocInfoCard({
  children,
  variant = 'default',
}: DocInfoCardProps) {
  const variantClasses = {
    default: 'bg-slate-50 border-slate-200',
    note: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  const textClasses = {
    default: 'text-slate-700',
    note: 'text-blue-800',
    warning: 'text-amber-800',
  };

  return (
    <div className={`rounded-lg ${variantClasses[variant]} p-5 border`}>
      <div className={`text-sm ${textClasses[variant]}`}>{children}</div>
    </div>
  );
}
