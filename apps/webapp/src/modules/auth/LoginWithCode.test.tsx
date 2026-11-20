import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginWithCode } from './LoginWithCode';

const { push, verifyLoginCode } = vi.hoisted(() => ({
  push: vi.fn(),
  verifyLoginCode: vi.fn(async () => ({ success: true, message: 'ok' })),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('convex-helpers/react/sessions', () => ({
  useSessionMutation: vi.fn(() => verifyLoginCode),
}));

async function submitCode() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Enter login code'), 'ABCD1234');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('LoginWithCode returnTo', () => {
  beforeEach(() => {
    push.mockClear();
    verifyLoginCode.mockClear();
  });

  it('pushes the sanitized returnTo after verification', async () => {
    render(<LoginWithCode returnTo="/cli/authorize?request=ID" />);
    await submitCode();

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/cli/authorize?request=ID'));
  });

  it('pushes /app when returnTo is unsafe', async () => {
    render(<LoginWithCode returnTo="https://evil.example" />);
    await submitCode();

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
  });
});
