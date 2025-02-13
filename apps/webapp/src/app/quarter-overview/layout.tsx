import { SessionProvider } from '@/modules/auth/SessionContext';

export default function QuarterOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
