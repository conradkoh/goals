'use client';

import { Toaster } from '@/components/ui/toaster';
import { DashboardProvider } from '@/hooks/useDashboard';
import { RequireLogin } from '@/modules/auth/RequireLogin';

/**
 * Main application layout with authentication requirement and dashboard context for all child routes.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireLogin>
      <DashboardProvider>
        <div id="app-layout" className="h-full bg-background flex flex-col">
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <Toaster />
      </DashboardProvider>
    </RequireLogin>
  );
}
