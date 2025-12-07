'use client';

import { Toaster } from '@/components/ui/toaster';
import { DashboardProvider } from '@/hooks/useDashboard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div id="dashboard-layout" className="h-full bg-background flex flex-col">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toaster />
    </DashboardProvider>
  );
}
