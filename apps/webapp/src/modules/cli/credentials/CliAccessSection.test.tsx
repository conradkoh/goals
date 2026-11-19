import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { CliCredentialView, RevokeResult } from '@workspace/backend/convex/cli/auth';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CliAccessSection } from './CliAccessSection';

/**
 * These tests drive the real section through mocked session ports only: the
 * Convex hooks are replaced with the fixture list and the revoke spy, and
 * `sonner` is replaced so toast calls can be asserted. The row, the badge and
 * the dialog are rendered for real.
 */
const mocks = vi.hoisted(() => ({
  credentials: undefined as CliCredentialView[] | undefined,
  revoke: vi.fn(),
}));

vi.mock('convex-helpers/react/sessions', () => ({
  useSessionQuery: (ref: unknown) => {
    const name = (ref as Record<symbol, unknown>)[Symbol.for('functionName')];
    if (name !== 'cli/auth:listMyCliCredentials') {
      throw new Error(`Unexpected session query in CliAccessSection test: ${String(name)}`);
    }
    return mocks.credentials;
  },
  useSessionMutation: (ref: unknown) => {
    const name = (ref as Record<symbol, unknown>)[Symbol.for('functionName')];
    if (name !== 'cli/auth:revokeCliCredential') {
      throw new Error(`Unexpected session mutation in CliAccessSection test: ${String(name)}`);
    }
    return mocks.revoke;
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const activeCredential: CliCredentialView = {
  id: 'cred-active' as Id<'cliCredentials'>,
  machineName: "Conrad's MacBook Pro",
  environment: 'local',
  createdAt: new Date('2026-11-02T10:00:00.000Z').getTime(),
  lastUsedAt: new Date('2026-11-19T09:00:00.000Z').getTime(),
  expiresAt: new Date('2027-05-01T10:00:00.000Z').getTime(),
  expired: false,
};

const expiredCredential: CliCredentialView = {
  id: 'cred-expired' as Id<'cliCredentials'>,
  machineName: 'work-laptop',
  environment: 'production',
  createdAt: new Date('2026-01-03T10:00:00.000Z').getTime(),
  expiresAt: new Date('2026-07-02T10:00:00.000Z').getTime(),
  expired: true,
};

const unreportedCredential: CliCredentialView = {
  id: 'cred-unreported' as Id<'cliCredentials'>,
  machineName: 'build-box',
  createdAt: new Date('2026-03-04T10:00:00.000Z').getTime(),
  expiresAt: new Date('2027-03-04T10:00:00.000Z').getTime(),
  expired: false,
};

function activeRevokeButton() {
  return screen.getByRole('button', { name: "Revoke access for Conrad's MacBook Pro" });
}

function expiredRemoveButton() {
  return screen.getByRole('button', { name: 'Remove work-laptop' });
}

async function openDialogAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(activeRevokeButton());
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Revoke access' }));
  return dialog;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('CliAccessSection', () => {
  beforeEach(() => {
    mocks.credentials = undefined;
    mocks.revoke.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.info).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('shows skeleton rows while the list query is loading', () => {
    render(<CliAccessSection />);

    const busy = screen.getByLabelText('Loading CLI access');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
  });

  it('shows the goals auth login hint when no CLI access exists', () => {
    mocks.credentials = [];

    render(<CliAccessSection />);

    expect(screen.getByText('No CLI access yet')).toBeInTheDocument();
    expect(screen.getByText(/goals auth login/)).toBeInTheDocument();
  });

  it('renders populated rows with environment, last used and expired treatment', () => {
    mocks.credentials = [activeCredential, expiredCredential, unreportedCredential];

    render(<CliAccessSection />);

    expect(screen.getByText("Conrad's MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('Not reported')).toBeInTheDocument();
    expect(screen.getAllByText(/Last used never/)).toHaveLength(2);
    expect(activeRevokeButton()).toBeInTheDocument();

    const expiredRow = screen.getByText('work-laptop').closest('li');
    expect(expiredRow).not.toBeNull();
    expect(expiredRow).toHaveClass('opacity-70');
    expect(
      within(expiredRow as HTMLElement).getByText('Expired', { selector: '[data-slot="badge"]' })
    ).toBeInTheDocument();
    expect(expiredRemoveButton()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke work-laptop' })).not.toBeInTheDocument();
  });

  it('opens the revoke dialog with the machine name and cancels without mutating', async () => {
    const user = userEvent.setup();
    mocks.credentials = [activeCredential];

    render(<CliAccessSection />);

    await user.click(activeRevokeButton());

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Revoke CLI access?')).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Conrad's MacBook Pro (local)");
    expect(dialog).toHaveTextContent(/will immediately lose access to your goals/);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it('revokes with the credential id, closes the dialog and shows the success toast', async () => {
    const user = userEvent.setup();
    mocks.credentials = [activeCredential];
    mocks.revoke.mockResolvedValue({ success: true } satisfies RevokeResult);

    render(<CliAccessSection />);

    await openDialogAndConfirm(user);

    expect(mocks.revoke).toHaveBeenCalledWith({ credentialId: activeCredential.id });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Revoked access for Conrad's MacBook Pro");
  });

  it('treats an already-removed credential as info and closes the dialog', async () => {
    const user = userEvent.setup();
    mocks.credentials = [activeCredential];
    mocks.revoke.mockResolvedValue({
      success: false,
      reason: 'not_found',
    } satisfies RevokeResult);

    render(<CliAccessSection />);

    await openDialogAndConfirm(user);

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith('That CLI access was already removed');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with an inline error and retries after a thrown failure', async () => {
    const user = userEvent.setup();
    mocks.credentials = [activeCredential];
    mocks.revoke
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ success: true } satisfies RevokeResult);

    render(<CliAccessSection />);

    await openDialogAndConfirm(user);

    const dialog = await screen.findByRole('alertdialog');
    expect(
      await within(dialog).findByText(
        "Couldn't revoke access. Check your connection and try again."
      )
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));

    expect(mocks.revoke).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Revoked access for Conrad's MacBook Pro");
  });

  it('locks the cancel and action buttons and shows Revoking while in flight', async () => {
    const user = userEvent.setup();
    const revokeResult = deferred<RevokeResult>();
    mocks.credentials = [activeCredential];
    mocks.revoke.mockReturnValue(revokeResult.promise);

    render(<CliAccessSection />);

    await user.click(activeRevokeButton());
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke access' }));

    const revoking = await within(dialog).findByRole('button', { name: 'Revoking…' });
    expect(revoking).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();

    // The row underneath the modal is inert for accessibility queries, so assert on the DOM node.
    const rowButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Revoke access for Conrad\'s MacBook Pro"]'
    );
    expect(rowButton).toBeDisabled();

    revokeResult.resolve({ success: true });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Revoked access for Conrad's MacBook Pro");
  });

  it('removes an expired credential directly without opening a dialog', async () => {
    const user = userEvent.setup();
    mocks.credentials = [expiredCredential];
    mocks.revoke.mockResolvedValue({ success: true } satisfies RevokeResult);

    render(<CliAccessSection />);

    await user.click(expiredRemoveButton());

    expect(mocks.revoke).toHaveBeenCalledWith({ credentialId: expiredCredential.id });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Revoked access for work-laptop')
    );
  });

  it('shows an error toast when removing an expired credential throws and restores the row', async () => {
    const user = userEvent.setup();
    mocks.credentials = [expiredCredential];
    mocks.revoke.mockRejectedValue(new Error('offline'));

    render(<CliAccessSection />);

    await user.click(expiredRemoveButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't remove work-laptop. Try again.")
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(expiredRemoveButton()).toBeEnabled();
  });
});
