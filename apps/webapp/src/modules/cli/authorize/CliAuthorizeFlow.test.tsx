import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthorizationRequestView } from '@workspace/backend/convex/cli/auth';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CliAuthorizeFlow } from './CliAuthorizeFlow';

const mocks = vi.hoisted(() => ({
  view: undefined as AuthorizationRequestView | undefined,
  approve: vi.fn(),
  deny: vi.fn(),
}));

vi.mock('convex-helpers/react/sessions', () => ({
  useSessionQuery: () => mocks.view,
  useSessionMutation: (ref: unknown) => {
    const name = (ref as Record<symbol, unknown>)[Symbol.for('functionName')];
    return typeof name === 'string' && name.endsWith(':approveAuthorizationRequest')
      ? mocks.approve
      : mocks.deny;
  },
}));
vi.mock('@/modules/auth/AuthProvider', () => ({
  useCurrentUser: () => ({ name: 'Conrad' }),
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

const requestId = 'req-1';
const now = Date.now();

function pendingView(overrides: Partial<AuthorizationRequestView> = {}): AuthorizationRequestView {
  return {
    status: 'pending',
    machineName: "Conrad's MacBook Pro",
    environment: 'local',
    createdAt: now - 2 * 60_000,
    expiresAt: now + 8 * 60_000,
    ...overrides,
  };
}

function codeInput() {
  return screen.getByLabelText('Verification code from your terminal');
}

async function submitCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.type(codeInput(), code);
  await user.type(codeInput(), '{Enter}');
}

describe('CliAuthorizeFlow', () => {
  beforeEach(() => {
    mocks.view = undefined;
    mocks.approve.mockReset();
    mocks.deny.mockReset();
    sessionStorage.clear();
  });

  it('walks from ready through a mismatch to approved and keeps the success card when the view flips', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve
      .mockResolvedValueOnce({ success: false, reason: 'code_mismatch' })
      .mockResolvedValueOnce({ success: true });

    const { rerender } = render(<CliAuthorizeFlow requestId={requestId} />);

    expect(screen.getByText('Authorize Goals CLI')).toBeInTheDocument();
    expect(screen.getByText("Conrad's MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('Approving as Conrad')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));

    await submitCode(user, '999999');

    expect(await screen.findByText(/4 attempts left\./)).toBeInTheDocument();
    expect(codeInput()).toHaveValue('');
    expect(mocks.approve).toHaveBeenNthCalledWith(1, { requestId, userCode: '999999' });
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));

    await submitCode(user, '123456');

    expect(await screen.findByText('CLI access approved')).toBeInTheDocument();
    expect(screen.getByText(/Return to your terminal\./)).toBeInTheDocument();
    expect(screen.getByText(/will finish signing in on/)).toBeInTheDocument();
    expect(screen.getByText("Conrad's MacBook Pro")).toBeInTheDocument();
    expect(mocks.approve).toHaveBeenNthCalledWith(2, { requestId, userCode: '123456' });

    mocks.view = { status: 'consumed' };
    rerender(<CliAuthorizeFlow requestId={requestId} />);

    expect(screen.getByText('CLI access approved')).toBeInTheDocument();
  });

  it('shows the too-many-attempts card when the server rejects the fifth code', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockResolvedValue({ success: false, reason: 'too_many_attempts' });

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '999999');

    expect(await screen.findByText('Too many incorrect codes')).toBeInTheDocument();
  });

  it('shows the expired card when the server reports expiry', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockResolvedValue({ success: false, reason: 'expired' });

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '999999');

    expect(await screen.findByText('This request has expired')).toBeInTheDocument();
  });

  it('shows the already-handled card when another tab resolved the request', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockResolvedValue({ success: false, reason: 'already_resolved' });

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '999999');

    expect(await screen.findByText('Already handled')).toBeInTheDocument();
  });

  it('offers a retry when the approve mutation throws and preserves the typed code', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockRejectedValue(new Error('offline'));

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '123456');

    expect(await screen.findByText("Couldn't reach the server")).toBeInTheDocument();
    expect(codeInput()).toHaveValue('123 456');
    expect(screen.getByRole('button', { name: 'Approve access' })).toBeEnabled();
  });

  it('denies without a code and shows the denied-by-you card', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.deny.mockResolvedValue({ success: true });

    render(<CliAuthorizeFlow requestId={requestId} />);
    await user.click(screen.getByRole('button', { name: 'Deny' }));

    expect(await screen.findByText('Request denied')).toBeInTheDocument();
    expect(screen.getByText(/No access was granted\./)).toBeInTheDocument();
    expect(mocks.deny).toHaveBeenCalledWith({ requestId });
  });

  it('keeps the failed-attempt count across a remount for the same request', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockResolvedValue({ success: false, reason: 'code_mismatch' });

    const first = render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '999999');
    expect(await screen.findByText(/4 attempts left\./)).toBeInTheDocument();
    first.unmount();

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '888888');
    expect(await screen.findByText(/3 attempts left\./)).toBeInTheDocument();
  });

  it('keeps the code out of the DOM text and session storage', async () => {
    const user = userEvent.setup();
    mocks.view = pendingView();
    mocks.approve.mockResolvedValue({ success: false, reason: 'code_mismatch' });

    render(<CliAuthorizeFlow requestId={requestId} />);
    await submitCode(user, '123456');

    await screen.findByText(/4 attempts left\./);
    expect(document.body.textContent).not.toContain('123456');
    expect(document.body.textContent).not.toContain('123 456');
    for (const key of Object.keys(sessionStorage)) {
      const value = sessionStorage.getItem(key) ?? '';
      expect(value).not.toMatch(/\d{6}/);
    }
  });
});

describe('CliAuthorizeFlow expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    mocks.view = pendingView({
      createdAt: Date.now(),
      expiresAt: Date.now() + 2_000,
    });
    mocks.approve.mockReset();
    mocks.deny.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flips to the expired card when the clock passes expiresAt without a reload', () => {
    render(<CliAuthorizeFlow requestId={requestId} />);
    expect(screen.getByText('Authorize Goals CLI')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('This request has expired')).toBeInTheDocument();
  });
});
