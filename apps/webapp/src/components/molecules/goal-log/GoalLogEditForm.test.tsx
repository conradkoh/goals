import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GoalLogEditForm, type GoalLogEditDraft } from './GoalLogCreateForm';

// jsdom cannot load the editor CSS module; a textarea stands in for the editor.
vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => html.replace(/<[^>]*>/g, '').trim() === '',
  stripTrailingEmptyParagraphs: (html: string) => html,
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      aria-label="Log content editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const draft: GoalLogEditDraft = {
  logDate: new Date(2026, 0, 15, 9, 30),
  logTime: '09:30',
  content: '<p>Entry</p>',
};

describe('GoalLogEditForm pointer selection', () => {
  it('stays open through a press in the editor, a drag outside, and a release outside', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <GoalLogEditForm
          draft={draft}
          onDraftChange={vi.fn()}
          onSave={onSave}
          onCancel={onCancel}
        />
        <button type="button">Outside</button>
      </>
    );
    const editor = screen.getByRole('textbox', { name: /log content editor/i });
    const outside = screen.getByRole('button', { name: 'Outside' });
    await user.pointer({ keys: '[MouseLeft>]', target: editor });
    await user.pointer({ target: outside });
    await user.pointer({ keys: '[/MouseLeft]', target: outside });
    expect(screen.getByRole('heading', { name: 'Edit Log Entry' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /log content editor/i })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
