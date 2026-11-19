import { render, screen } from '@testing-library/react';
import { featureFlags } from '@workspace/backend/config/featureFlags';
import type { AuthState } from '@workspace/backend/modules/auth/types/AuthState';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CliAuthorizePage } from './CliAuthorizePage';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  authState: undefined as AuthState | undefined,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/modules/auth/AuthProvider', () => ({
  useAuthState: () => mocks.authState,
  useCurrentUser: () => undefined,
}));
vi.mock('@workspace/backend/config/featureFlags', () => ({
  featureFlags: { disableLogin: false },
}));

describe('CliAuthorizePage', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams();
    mocks.authState = undefined;
    featureFlags.disableLogin = false;
  });

  it('shows the not-found card when the request param is missing', () => {
    render(<CliAuthorizePage />);
    expect(screen.getByText('Link not recognised')).toBeInTheDocument();
  });

  it('shows the login-disabled card before checking auth', () => {
    mocks.searchParams = new URLSearchParams({ request: 'req-1' });
    featureFlags.disableLogin = true;

    render(<CliAuthorizePage />);

    expect(screen.getByText('Login Disabled')).toBeInTheDocument();
  });

  it('shows the loading screen while auth state is unknown', () => {
    mocks.searchParams = new URLSearchParams({ request: 'req-1' });

    render(<CliAuthorizePage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('sends signed-out visitors to login with an encoded returnTo', () => {
    mocks.searchParams = new URLSearchParams({ request: 'req-1' });
    mocks.authState = { sessionId: 's', state: 'unauthenticated', reason: 'no_session' };

    render(<CliAuthorizePage />);

    expect(screen.getAllByText('Sign in to continue')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fcli%2Fauthorize%3Frequest%3Dreq-1'
    );
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  it('does not disclose machine details before sign-in', () => {
    mocks.searchParams = new URLSearchParams({ request: 'req-1' });
    mocks.authState = { sessionId: 's', state: 'unauthenticated', reason: 'no_session' };

    render(<CliAuthorizePage />);

    expect(screen.queryByText('Machine')).not.toBeInTheDocument();
  });
});
