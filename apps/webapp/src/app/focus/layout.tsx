'use client';
import { ClientOnly } from '@/components/util/ClientOnly';
import { SessionProvider } from '@/modules/auth/SessionContext';

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <SessionProvider>{children}</SessionProvider>
    </ClientOnly>
  );
}
