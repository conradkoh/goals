import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GoalDetailsSection } from './GoalDetailsSection';

vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => {
    const textContent = html.replace(/<[^>]*>/g, '');
    const cleanContent = textContent.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    return cleanContent === '';
  },
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
  it('shows empty state for undefined details when onEditClick is provided', () => {
    const onEditClick = vi.fn();
    render(
      <GoalDetailsSection title="Goal" details="" onEditClick={onEditClick} showSeparator={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /no details/i }));
    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('shows empty state for empty HTML details', () => {
    render(
      <GoalDetailsSection
        title="Goal"
        details="<p></p>"
        onEditClick={vi.fn()}
        showSeparator={false}
      />
    );
    expect(screen.getByRole('button', { name: /no details/i })).toBeInTheDocument();
  });

  it('renders content when details have text', () => {
    render(<GoalDetailsSection title="Goal" details="<p>Hello</p>" showSeparator={false} />);
    expect(screen.queryByRole('button', { name: /no details/i })).not.toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('returns null when no details and no onEditClick', () => {
    const { container } = render(
      <GoalDetailsSection title="Goal" details="" showSeparator={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
