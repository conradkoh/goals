import { render, screen } from '@testing-library/react';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { describe, expect, it, vi } from 'vitest';

import { GoalDetailsBody } from './GoalDetailsBody';

const hooks = vi.hoisted(() => ({
  useGoalLogs: vi.fn(),
  useGoalLogsByRootGoal: vi.fn(),
}));

vi.mock('@/hooks/useGoalLogs', () => ({
  useGoalLogs: hooks.useGoalLogs,
  useGoalLogsByRootGoal: hooks.useGoalLogsByRootGoal,
}));

vi.mock('@/modules/auth/useSession', () => ({
  useSession: () => ({ sessionId: 'session-1' }),
}));

// jsdom cannot load the editor CSS. Render the HTML, and expose a "Toggle task" control that
// simulates a checkbox toggle through onContentChange.
vi.mock('@/components/ui/interactive-html', () => ({
  InteractiveHTML: ({
    html,
    className,
    onContentChange,
  }: {
    html: string;
    className?: string;
    onContentChange?: (html: string) => void;
  }) => (
    <div className={className}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {onContentChange && (
        <button type="button" onClick={() => onContentChange('<p>changed</p>')}>
          Toggle task
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/ui/safe-html', () => ({
  SafeHTML: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

// Textarea stand-in for the rich text editor: value is plain text, onChange wraps it in <p>.
vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => {
    const textContent = html.replace(/<[^>]*>/g, '');
    const cleanContent = textContent.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    return cleanContent === '';
  },
  stripTrailingEmptyParagraphs: (html: string) => html,
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea
      aria-label="Content"
      value={value.replace(/<[^>]*>/g, '')}
      onChange={(e) => onChange(`<p>${e.target.value}</p>`)}
    />
  ),
}));

function makeLog(day: number): GoalLog {
  return {
    _id: `log${day}` as Id<'goalLogs'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    goalId: 'goal-1' as Id<'goals'>,
    rootGoalId: 'goal-1' as Id<'goals'>,
    logDate: Date.UTC(2026, 2, day, 9),
    content: `<p>log-${day}</p>`,
    createdAt: day,
  };
}

function setLogs() {
  hooks.useGoalLogs.mockReturnValue({
    logs: [makeLog(1)],
    rootGoalId: undefined,
    hasCarryOverHistory: false,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createLog: vi.fn().mockResolvedValue(null),
    updateLog: vi.fn().mockResolvedValue(undefined),
    deleteLog: vi.fn(),
  });
  hooks.useGoalLogsByRootGoal.mockReturnValue({ logs: undefined, isLoading: false });
}

const GOAL_ID = 'goal-1' as Id<'goals'>;
const DETAILS = '<p>Ship the quarterly plan</p>';

/** Whether `first` appears before `second` in document order. */
function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('GoalDetailsBody', () => {
  it('orders Details, then the children slot, then the Log section', () => {
    setLogs();
    render(
      <GoalDetailsBody
        goalId={GOAL_ID}
        title="Ship Q3"
        details={DETAILS}
        childrenSection={<div>child-slot</div>}
      />
    );

    const details = screen.getByText('Ship the quarterly plan');
    const childSlot = screen.getByText('child-slot');
    const logHeading = screen.getByRole('heading', { name: /^Log/ });

    expect(precedes(details, childSlot)).toBe(true);
    expect(precedes(childSlot, logHeading)).toBe(true);
  });

  it('leaves out the children block when no children section is passed', () => {
    setLogs();
    const { container } = render(
      <GoalDetailsBody goalId={GOAL_ID} title="Ship Q3" details={DETAILS} />
    );

    expect(container.querySelector('[data-slot="goal-details-children"]')).toBeNull();
    expect(screen.queryByText('child-slot')).toBeNull();

    const details = screen.getByText('Ship the quarterly plan');
    const logHeading = screen.getByRole('heading', { name: /^Log/ });
    expect(precedes(details, logHeading)).toBe(true);
  });

  it('draws both separators when there are details and children', () => {
    setLogs();
    const { container } = render(
      <GoalDetailsBody
        goalId={GOAL_ID}
        title="Ship Q3"
        details={DETAILS}
        childrenSection={<div>child-slot</div>}
      />
    );

    const root = container.querySelector('[data-slot="goal-details-body"]') as HTMLElement;
    expect(root.querySelectorAll(':scope > [data-slot="separator"]')).toHaveLength(2);
  });

  it('draws only the separator before the Log section when read-only details are empty', () => {
    setLogs();
    const { container } = render(
      <GoalDetailsBody
        goalId={GOAL_ID}
        title="Ship Q3"
        details=""
        childrenSection={<div>child-slot</div>}
      />
    );

    const root = container.querySelector('[data-slot="goal-details-body"]') as HTMLElement;
    expect(root.querySelectorAll(':scope > [data-slot="separator"]')).toHaveLength(1);
    expect(root.firstElementChild?.getAttribute('data-slot')).toBe('goal-details-children');
  });

  it('draws only the separator before the Log section when there are no children', () => {
    setLogs();
    const { container } = render(
      <GoalDetailsBody goalId={GOAL_ID} title="Ship Q3" details={DETAILS} />
    );

    const root = container.querySelector('[data-slot="goal-details-body"]') as HTMLElement;
    expect(root.querySelectorAll(':scope > [data-slot="separator"]')).toHaveLength(1);
  });

  it('renders no tabs', () => {
    setLogs();
    render(<GoalDetailsBody goalId={GOAL_ID} title="Ship Q3" details={DETAILS} />);

    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('keeps its root free of nested scroll and fixed-height utilities', () => {
    setLogs();
    const { container } = render(
      <GoalDetailsBody goalId={GOAL_ID} title="Ship Q3" details={DETAILS} />
    );

    const root = container.querySelector('[data-slot="goal-details-body"]') as HTMLElement;
    expect(root.className).not.toMatch(/overflow|max-h|h-full|flex-1|min-h-0/);
  });
});
