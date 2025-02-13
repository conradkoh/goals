'use client';

import { ClientOnly } from '@/components/util/ClientOnly';
import { DashboardProvider } from '@/hooks/useDashboard';
import { SessionProvider } from '@/modules/auth/SessionContext';

export default function QuarterOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <SessionProvider>
        <DashboardProvider>{children}</DashboardProvider>
      </SessionProvider>
    </ClientOnly>
  );
}
