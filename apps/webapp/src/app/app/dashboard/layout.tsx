'use client';

import { User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { DashboardProvider } from '@/hooks/useDashboard';
import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SyncPassphrase } from '@/components/organisms/sync/SyncPassphrase';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <DashboardProvider>
          <div
            id="dashboard-layout"
            className="h-screen bg-background flex flex-col"
          >
            <Header />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
          <Toaster />
        </DashboardProvider>
  );
}

const Header = () => {
  const { sessionId } = useSession();
  const user = useQuery(api.auth.getUser, { sessionId });

  return (
    <header className="border-b shadow-sm">
      <div className="max-w-screen-2xl mx-auto w-full">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-semibold">Goals</h1>

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
                <div className="flex items-center gap-3">
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
              <Separator />
              <div className="py-2">
                <Link
                  href="/docs"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Documentation</span>
                </Link>
                <SyncPassphrase />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};
