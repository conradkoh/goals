'use client';

import { ArrowLeft, BookOpen, Download, Keyboard, Menu, PlayCircle, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    {
      title: 'Getting Started',
      href: '/docs/terminology',
      icon: <PlayCircle className="h-4 w-4" />,
    },
    {
      title: 'Installation Guide',
      href: '/docs/installation',
      icon: <Download className="h-4 w-4" />,
    },
    {
      title: 'Keyboard Shortcuts',
      href: '/docs/keyboard-shortcuts',
      icon: <Keyboard className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-semibold">Documentation</h1>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-background md:hidden pt-16">
          <nav className="container py-8">
            <ul className="space-y-3 flex flex-col items-center">
              {navItems.map((item) => (
                <li key={item.href} className="w-full max-w-xs">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center w-full gap-3 rounded-md px-4 py-3 text-sm font-medium hover:bg-accent',
                      pathname === item.href
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                      {item.icon}
                    </span>
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
              <li className="w-full max-w-xs pt-3 mt-3 border-t border-border">
                <Link
                  href="/app"
                  className="flex items-center w-full gap-3 rounded-md px-4 py-3 text-sm font-medium hover:bg-accent text-muted-foreground"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                  <span>Go to Dashboard</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <div className="container flex-1 items-start md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop sidebar */}
        <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="h-full py-10 px-4">
            <nav className="flex flex-col space-y-3 w-full">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center w-full gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border">
                <Link
                  href="/app"
                  className="flex items-center w-full gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                  <span>Go to Dashboard</span>
                </Link>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex w-full flex-col py-8 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
