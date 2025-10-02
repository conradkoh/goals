import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { Button } from '@/components/ui/button';

interface DocCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
  variant?: 'blue' | 'indigo';
}

export function DocCard({
  title,
  description,
  icon,
  href,
  children,
  variant = 'blue',
}: DocCardProps) {
  const headerVariants = {
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
  };

  const iconVariants = {
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };

  const buttonVariants = {
    blue: 'border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300',
    indigo: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300',
  };

  return (
    <div className="overflow-hidden border-none rounded-lg shadow-md flex flex-col h-full">
      <div className={`${headerVariants[variant]} h-2`} />
      <div className="pt-6 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${iconVariants[variant]}`}
          >
            {icon}
          </div>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-slate-600 text-sm">{description}</p>
      </div>
      <div className="p-6 pt-3 flex-1 flex flex-col">
        <div className="flex-1 min-h-[180px]">{children}</div>
        <div className="mt-auto pt-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`w-full ${buttonVariants[variant]} group font-medium`}
          >
            <Link href={href} className="flex items-center justify-center gap-1.5">
              View Guide
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
