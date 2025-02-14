'use client';

import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { ClientOnly } from '@/components/util/ClientOnly';
import { DashboardProvider } from '@/hooks/useDashboard';
import { SessionProvider } from '@/modules/auth/SessionContext';
import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <SessionProvider>
        <DashboardProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="flex flex-col h-[calc(100vh-4rem)] mt-2">
              {children}
            </main>
          </div>
          <Toaster />
        </DashboardProvider>
      </SessionProvider>
    </ClientOnly>
  );
}

const Header = () => {
  const { sessionId } = useSession();
  const user = useQuery(api.auth.getUser, { sessionId });

  return (
    <header className="border-b">
      <div className="w-full flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold">Goals Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="border-b px-4 py-3">
                <h4 className="text-sm font-medium">Account</h4>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-full bg-secondary p-2">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || 'Loading...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anonymous User
                    </p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};
