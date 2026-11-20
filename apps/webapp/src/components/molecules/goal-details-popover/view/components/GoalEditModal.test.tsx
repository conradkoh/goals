import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { describe, expect, it, vi } from 'vitest';

import { GoalEditModal } from './GoalEditModal';

import { RELEASE_NOTES_MD } from '@/components/ui/rich-text-markdown-paste.fixtures';

vi.mock('@/components/ui/rich-text-editor.module.css', () => ({ default: {} }));

// Convex-backed hooks are the external boundary; the editor and dialog stay real.
vi.mock('@/modules/auth/useSession', () => ({
  useSession: () => ({ sessionId: 'session-test' }),
}));
vi.mock('@/hooks/useDomains', () => ({
  useDomains: () => ({
    domains: [],
    createDomain: vi.fn(),
    updateDomain: vi.fn(),
    deleteDomain: vi.fn(),
  }),
}));
vi.mock('@/hooks/useInitiatives', () => ({
  useInitiatives: () => ({ initiatives: [] }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

/**
 * jsdom has no layout engine, so it omits the range geometry ProseMirror asks for while scrolling
 * a selection into view. Empty client rects plus a zero bounding rect keep that code on its
 * no-layout path instead of throwing.
 */
const zeroRect = () =>
  ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

Object.assign(Range.prototype, {
  getClientRects: () => [] as unknown as DOMRectList,
  getBoundingClientRect: zeroRect,
});

/**
 * Fires a paste at the editor DOM the way a browser would. jsdom's ClipboardEvent
 * ignores the `clipboardData` init, so the payload is attached explicitly.
 */
function paste(dom: HTMLElement, data: { text: string; html?: string }) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (type: string) =>
        type === 'text/plain' ? data.text : type === 'text/html' ? (data.html ?? '') : '',
    },
  });
  act(() => {
    fireEvent(dom, event);
  });
}

const GOAL = {
  _id: 'goals:test' as Id<'goals'>,
  title: 'Ship markdown paste',
  details: '',
  depth: 0,
  dueDate: undefined,
  domainId: null,
  initiativeId: null,
} as unknown as GoalWithDetailsAndChildren;

async function renderModal() {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<GoalEditModal isOpen goal={GOAL} onSave={onSave} onClose={onClose} />);

  // Scope to the dialog: the modal mounts the editor with `immediatelyRender: false`.
  const dialog = screen.getByRole('dialog');
  await waitFor(() => expect(dialog.querySelector('.ProseMirror')).not.toBeNull());

  const editor = dialog.querySelector('.ProseMirror') as HTMLElement | null;
  return { editor, onSave };
}

describe('GoalEditModal Details field', () => {
  it('formats a pasted Markdown document as rich text', async () => {
    const { editor } = await renderModal();
    expect(editor).not.toBeNull(); // fails if the modal stops using the shared editor
    paste(editor as HTMLElement, { text: RELEASE_NOTES_MD });

    expect(editor?.firstElementChild?.tagName).toBe('H1');
    expect(editor?.firstElementChild?.textContent).toBe('Release notes');
    expect(editor?.querySelector('strong')?.textContent).toBe('bold');
    expect(editor?.querySelector('blockquote')).not.toBeNull();
  });

  it('saves the formatted Details as HTML', async () => {
    const { editor, onSave } = await renderModal();
    expect(editor).not.toBeNull();
    paste(editor as HTMLElement, { text: RELEASE_NOTES_MD });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const savedDetails = onSave.mock.calls[0][1] as string;
    expect(savedDetails).toMatch(/<h1>Release notes<\/h1>/);
    expect(savedDetails).toMatch(/<strong>bold<\/strong>/);
    expect(savedDetails).not.toContain('# Release notes');
  });
});
