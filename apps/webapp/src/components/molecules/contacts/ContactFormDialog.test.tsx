import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it, vi } from 'vitest';

import { ContactFormDialog } from './ContactFormDialog';

import { toast } from '@/components/ui/use-toast';

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const CONTACT_ID = 'contacts:test' as Id<'contacts'>;

function makeContact(
  overrides: Partial<Doc<'contacts'>> & Pick<Doc<'contacts'>, 'name'>
): Doc<'contacts'> {
  return {
    _id: CONTACT_ID,
    _creationTime: 0,
    userId: 'users:test' as Doc<'contacts'>['userId'],
    createdAt: 1,
    updatedAt: 1,
    email: 'alice@example.com',
    organization: 'Acme Corp',
    notes: 'Met at a conference',
    ...overrides,
  };
}

describe('ContactFormDialog', () => {
  it('disables submit for whitespace-only name in create mode', () => {
    render(
      <ContactFormDialog
        open
        onOpenChange={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('button', { name: /create contact/i })).toBeDisabled();
  });

  it('trims fields, omits blank optionals, and closes on successful create', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <ContactFormDialog
        open
        onOpenChange={onOpenChange}
        onCreate={onCreate}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: '  Alice  ' } });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: '  alice@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText(/organization/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('prepopulates edit mode and calls onUpdate with the selected contact ID', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const contact = makeContact({ name: 'Alice' });

    render(
      <ContactFormDialog
        open
        contact={contact}
        onOpenChange={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onUpdate={onUpdate}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Alice');
    expect(screen.getByLabelText(/email/i)).toHaveValue('alice@example.com');
    expect(screen.getByLabelText(/organization/i)).toHaveValue('Acme Corp');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Met at a conference');

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(CONTACT_ID, {
        name: 'Alice',
        email: null,
        organization: 'Acme Corp',
        notes: 'Met at a conference',
      });
    });
  });

  it('requires delete confirmation before calling onDelete', async () => {
    // Nested Dialog + AlertDialog focus traps overflow under userEvent in jsdom;
    // use fireEvent for this interaction path.
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const contact = makeContact({ name: 'Alice' });

    render(
      <ContactFormDialog
        open
        contact={contact}
        onOpenChange={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();

    const alertDialog = await screen.findByRole('alertdialog');
    expect(
      within(alertDialog).getByRole('heading', { name: /delete contact/i })
    ).toBeInTheDocument();

    fireEvent.click(within(alertDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(CONTACT_ID);
    });
  });

  it('keeps the dialog open when save is rejected', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Save failed'));
    const onOpenChange = vi.fn();

    render(
      <ContactFormDialog
        open
        onOpenChange={onOpenChange}
        onCreate={onCreate}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('heading', { name: /new contact/i })).toBeInTheDocument();
  });
});
