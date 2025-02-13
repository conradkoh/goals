'use client';

import { ClientOnly } from '@/components/util/ClientOnly';
import { DashboardProvider } from '@/hooks/useDashboard';
import { SessionProvider } from '@/modules/auth/SessionContext';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="w-full flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold">Goals Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-8"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-col h-[calc(100vh-4rem)] mt-2">
        {children}
      </main>
    </div>
  );
};

export default function QuarterOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <SessionProvider>
        <DashboardProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </DashboardProvider>
      </SessionProvider>
    </ClientOnly>
  );
}
