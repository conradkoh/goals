import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CliApprovalForm } from './CliApprovalForm';
import type { FormError } from './deriveAuthorizeScreen';

function Harness({
  initialCode = '',
  busy = null,
  error = null,
  approverName,
  onApprove = vi.fn(),
  onDeny = vi.fn(),
}: {
  initialCode?: string;
  busy?: 'approve' | 'deny' | null;
  error?: FormError | null;
  approverName?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const inputRef = createRef<HTMLInputElement>();
  return (
    <CliApprovalForm
      code={code}
      onCodeChange={setCode}
      busy={busy}
      error={error}
      approverName={approverName}
      onApprove={onApprove}
      onDeny={onDeny}
      inputRef={inputRef}
    />
  );
}

describe('CliApprovalForm', () => {
  it('renders the label, guidance and anti-phishing caveat', () => {
    render(<Harness />);

    expect(screen.getByLabelText('Verification code from your terminal')).toBeInTheDocument();
    expect(
      screen.getByText(/This page never shows the code\. Five wrong codes deny this request\./)
    ).toBeInTheDocument();
    expect(screen.getByText('Only continue if you started this')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Only continue if you started this');
  });

  it('disables Approve until exactly six digits are present', async () => {
    const user = userEvent.setup();
    render(<Harness initialCode="12345" />);

    expect(screen.getByRole('button', { name: 'Approve access' })).toBeDisabled();

    await user.type(screen.getByLabelText('Verification code from your terminal'), '6');

    expect(screen.getByRole('button', { name: 'Approve access' })).toBeEnabled();
  });

  it('strips non-digits and caps the code at six digits', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Verification code from your terminal');

    await user.type(input, 'a1b2c3d4e5f6g7');

    expect(input).toHaveValue('123 456');
  });

  it('accepts a pasted code with a space', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Verification code from your terminal');

    await user.click(input);
    await user.paste('123 456');

    expect(input).toHaveValue('123 456');
  });

  it('submits on Enter when six digits are present', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<Harness initialCode="123456" onApprove={onApprove} />);

    await user.type(screen.getByLabelText('Verification code from your terminal'), '{Enter}');

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('shows the mismatch message with attempts left and the last-attempt variant', () => {
    const { rerender } = render(
      <Harness error={{ kind: 'mismatch', attemptsLeft: 4 }} initialCode="" />
    );
    expect(
      screen.getByText(/That code doesn't match the one in your terminal\. 4 attempts left\./)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Verification code from your terminal')).toHaveAttribute(
      'aria-invalid',
      'true'
    );

    rerender(
      <CliApprovalForm
        code=""
        onCodeChange={vi.fn()}
        busy={null}
        error={{ kind: 'mismatch', attemptsLeft: 1 }}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
      />
    );
    expect(
      screen.getByText(/This may be your last attempt: another wrong code can deny this request\./)
    ).toBeInTheDocument();
  });

  it('renders the network retry alert for both actions', () => {
    const { rerender } = render(<Harness error={{ kind: 'network', action: 'approve' }} />);
    expect(screen.getByText("Couldn't reach the server")).toBeInTheDocument();
    expect(screen.getByText("Your code wasn't submitted. Try again.")).toBeInTheDocument();

    rerender(
      <CliApprovalForm
        code=""
        onCodeChange={vi.fn()}
        busy={null}
        error={{ kind: 'network', action: 'deny' }}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
      />
    );
    expect(screen.getByText("The request wasn't denied. Try again.")).toBeInTheDocument();
  });

  it('disables both actions while in flight', () => {
    render(<Harness busy="approve" initialCode="123456" />);

    expect(screen.getByRole('button', { name: /Approving/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
    expect(screen.getByLabelText('Verification code from your terminal')).toBeDisabled();
  });

  it('never renders the typed code outside the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Verification code from your terminal');

    await user.type(input, '987654');

    expect(document.body.textContent).not.toContain('987654');
    expect(document.body.textContent).not.toContain('987 654');
  });

  it('shows who is approving when a name is available', () => {
    render(<Harness approverName="Conrad" />);
    expect(screen.getByText('Approving as Conrad')).toBeInTheDocument();
  });

  it('calls onDeny without needing a code', async () => {
    const user = userEvent.setup();
    const onDeny = vi.fn();
    render(<Harness onDeny={onDeny} />);

    await user.click(screen.getByRole('button', { name: 'Deny' }));

    expect(onDeny).toHaveBeenCalledTimes(1);
  });
});
