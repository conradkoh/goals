import { CLI_MAX_CODE_ATTEMPTS } from '@workspace/backend/modules/cli/constants';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Info,
  type LucideIcon,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { AuthorizeScreen } from './deriveAuthorizeScreen';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatusKind = Exclude<AuthorizeScreen['kind'], 'loading' | 'ready'>;

interface StatusAction {
  label: string;
  href: string;
  variant?: 'default' | 'outline';
}

interface StatusConfig {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  body: (context: { machineName?: string; ttlMinutes?: number }) => ReactNode;
  actions: StatusAction[];
}

const GOALS_LOGIN = (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">goals auth login</code>
);

const CONFIG: Record<StatusKind, StatusConfig> = {
  approved: {
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    title: 'CLI access approved',
    body: ({ machineName }) => (
      <>
        Return to your terminal. {GOALS_LOGIN} will finish signing in on{' '}
        <strong>{machineName ?? 'your machine'}</strong>. You can close this tab.
      </>
    ),
    actions: [{ label: 'Manage CLI access', href: '/app/profile#cli-access', variant: 'outline' }],
  },
  'denied-by-you': {
    icon: XCircle,
    iconClass: 'text-muted-foreground',
    title: 'Request denied',
    body: () => 'No access was granted. The CLI will report that the login was denied.',
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  'too-many-attempts': {
    icon: ShieldAlert,
    iconClass: 'text-destructive',
    title: 'Too many incorrect codes',
    body: () => (
      <>
        This request was denied after {CLI_MAX_CODE_ATTEMPTS} wrong codes. Run {GOALS_LOGIN} again
        to get a new code.
      </>
    ),
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  expired: {
    icon: Clock,
    iconClass: 'text-muted-foreground',
    title: 'This request has expired',
    body: ({ ttlMinutes }) => (
      <>
        {ttlMinutes === undefined ? null : `Login requests expire after ${ttlMinutes} minutes. `}
        Run {GOALS_LOGIN} in your terminal to start a new one.
      </>
    ),
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  'already-approved': {
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    title: 'Already approved',
    body: () =>
      "This request was already approved, possibly in another tab. Return to your terminal. If you didn't approve it, review your CLI access.",
    actions: [{ label: 'Review CLI access', href: '/app/profile#cli-access' }],
  },
  consumed: {
    icon: CheckCircle2,
    iconClass: 'text-muted-foreground',
    title: 'Already used',
    body: () =>
      "The terminal has already completed this login. If that wasn't you, revoke the credential from your profile.",
    actions: [{ label: 'Review CLI access', href: '/app/profile#cli-access' }],
  },
  denied: {
    icon: XCircle,
    iconClass: 'text-muted-foreground',
    title: 'Request denied',
    body: () => (
      <>
        This request was denied and can&apos;t be approved. Run {GOALS_LOGIN} again to start over.
      </>
    ),
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  'already-handled': {
    icon: Info,
    iconClass: 'text-muted-foreground',
    title: 'Already handled',
    body: () =>
      'This request was already resolved from another tab or the terminal. Check your terminal.',
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  'not-found': {
    icon: FileQuestion,
    iconClass: 'text-muted-foreground',
    title: 'Link not recognised',
    body: () => <>This approval link is invalid or too old. Run {GOALS_LOGIN} to get a new link.</>,
    actions: [{ label: 'Back to Goals', href: '/app' }],
  },
  'login-disabled': {
    icon: AlertCircle,
    iconClass: 'text-muted-foreground/60',
    title: 'Login Disabled',
    body: () => 'CLI approvals are unavailable while login is disabled for this application.',
    actions: [{ label: 'Back to Home', href: '/' }],
  },
};

interface CliAuthorizeStatusCardProps {
  kind: StatusKind;
  machineName?: string;
  ttlMinutes?: number;
}

/**
 * Terminal screen for every approval state that does not accept input.
 *
 * Actions are links styled as buttons (never a button inside an anchor) and fill the card width
 * so they stay keyboard reachable and 44px tall on small screens.
 */
export function CliAuthorizeStatusCard({
  kind,
  machineName,
  ttlMinutes,
}: CliAuthorizeStatusCardProps) {
  const { icon: Icon, iconClass, title, body, actions } = CONFIG[kind];

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader className="items-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className={cn('size-6', iconClass)} aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-balance">
          {body({ machineName, ttlMinutes })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href as Route}
            className={cn(
              buttonVariants({ variant: action.variant ?? 'default' }),
              'h-11 w-full sm:h-10'
            )}
          >
            {action.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
