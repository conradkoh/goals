import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnonymousLoginButton } from './AnonymousLoginButton';

const { push, loginAnon } = vi.hoisted(() => ({
  push: vi.fn(),
  loginAnon: vi.fn(async () => ({})),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('convex-helpers/react/sessions', () => ({
  useSessionMutation: vi.fn(() => loginAnon),
}));

describe('AnonymousLoginButton returnTo', () => {
  beforeEach(() => {
    push.mockClear();
    loginAnon.mockClear();
  });

  it('pushes the sanitized returnTo after login', async () => {
    const user = userEvent.setup();
    render(<AnonymousLoginButton variant="list" returnTo="/cli/authorize?request=ID" />);

    await user.click(
      screen.getByRole('button', { name: 'Continue anonymously without creating an account' })
    );

    expect(push).toHaveBeenCalledWith('/cli/authorize?request=ID');
  });

  it('pushes /app when no returnTo is provided', async () => {
    const user = userEvent.setup();
    render(<AnonymousLoginButton variant="list" />);

    await user.click(
      screen.getByRole('button', { name: 'Continue anonymously without creating an account' })
    );

    expect(push).toHaveBeenCalledWith('/app');
  });

  it('pushes /app for an absolute returnTo', async () => {
    const user = userEvent.setup();
    render(<AnonymousLoginButton variant="list" returnTo="https://evil.example" />);

    await user.click(
      screen.getByRole('button', { name: 'Continue anonymously without creating an account' })
    );

    expect(push).toHaveBeenCalledWith('/app');
  });

  it('pushes /app for a protocol-relative returnTo', async () => {
    const user = userEvent.setup();
    render(<AnonymousLoginButton variant="list" returnTo="//evil.example" />);

    await user.click(
      screen.getByRole('button', { name: 'Continue anonymously without creating an account' })
    );

    expect(push).toHaveBeenCalledWith('/app');
  });
});
