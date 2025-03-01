import React from 'react';

interface DocListItemProps {
  children: React.ReactNode;
  variant?: 'blue' | 'indigo' | 'slate';
}

export function DocListItem({ children, variant = 'blue' }: DocListItemProps) {
  const variantClasses = {
    blue: 'bg-blue-100 border-blue-200',
    indigo: 'bg-indigo-100 border-indigo-200',
    slate: 'bg-slate-100 border-slate-200',
  };

  const dotClasses = {
    blue: 'bg-blue-700',
    indigo: 'bg-indigo-700',
    slate: 'bg-slate-700',
  };

  return (
    <li className="flex items-start gap-2">
      <div className={`rounded-full ${variantClasses[variant]} p-1 mt-0.5`}>
        <div
          className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`}
        ></div>
      </div>
      <span className="text-slate-600">{children}</span>
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
