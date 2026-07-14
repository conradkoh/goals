import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GoalDetailsSection } from './GoalDetailsSection';

vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => {
    const textContent = html.replace(/<[^>]*>/g, '');
    const cleanContent = textContent.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    return cleanContent === '';
  },
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      aria-label="Goal details editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/components/ui/safe-html', () => ({
  SafeHTML: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock('@/components/ui/interactive-html', () => ({
  InteractiveHTML: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

describe('GoalDetailsSection', () => {
  it('shows empty state for empty details when editable', () => {
    const onDetailsChange = vi.fn();
    render(
      <GoalDetailsSection
        title="Goal"
        details=""
        onDetailsChange={onDetailsChange}
        showSeparator={false}
      />
    );
    expect(screen.getByRole('button', { name: /no details/i })).toBeInTheDocument();
  });

  it('enters inline editor when clicking empty add button', () => {
    const onDetailsChange = vi.fn();
    render(
      <GoalDetailsSection
        title="Goal"
        details=""
        onDetailsChange={onDetailsChange}
        showSeparator={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /no details/i }));
    expect(screen.getByRole('textbox', { name: /goal details editor/i })).toBeInTheDocument();
  });

  it('saves details on Cmd+Enter in editor', () => {
    const onDetailsChange = vi.fn();
    render(
      <GoalDetailsSection
        title="Goal"
        details=""
        onDetailsChange={onDetailsChange}
        showSeparator={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /no details/i }));
    const editor = screen.getByRole('textbox', { name: /goal details editor/i });
    fireEvent.change(editor, { target: { value: '<p>New details</p>' } });
    const container = editor.closest('[class*="rounded-md"]');
    expect(container).not.toBeNull();
    fireEvent.keyDown(container as Element, { key: 'Enter', metaKey: true });
    expect(onDetailsChange).toHaveBeenCalled();
  });

  it('cancels editing on Escape', () => {
    const onDetailsChange = vi.fn();
    render(
      <GoalDetailsSection
        title="Goal"
        details=""
        onDetailsChange={onDetailsChange}
        showSeparator={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /no details/i }));
    const editor = screen.getByRole('textbox', { name: /goal details editor/i });
    expect(editor).toBeInTheDocument();
    const container = editor.closest('[class*="rounded-md"]');
    expect(container).not.toBeNull();
    fireEvent.keyDown(container as Element, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: /goal details editor/i })).not.toBeInTheDocument();
    expect(onDetailsChange).not.toHaveBeenCalled();
  });

  it('renders content when details have text', () => {
    render(<GoalDetailsSection title="Goal" details="<p>Hello</p>" showSeparator={false} />);
    expect(screen.queryByRole('button', { name: /no details/i })).not.toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('returns null when no details and not editable', () => {
    const { container } = render(
      <GoalDetailsSection title="Goal" details="" showSeparator={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
