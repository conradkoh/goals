import { render, screen } from '@testing-library/react';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';

import { GoalLogList } from './GoalLogList';

// jsdom cannot load the editor CSS module that InteractiveHTML imports; render its HTML directly.
vi.mock('@/components/ui/interactive-html', () => ({
  InteractiveHTML: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

function makeLog(id: string, content: string, localDate: DateTime, createdAt: number): GoalLog {
  return {
    _id: id as Id<'goalLogs'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    goalId: 'goals:test' as Id<'goals'>,
    rootGoalId: 'goals:test' as Id<'goals'>,
    logDate: localDate.toMillis(),
    content: `<p>${content}</p>`,
    createdAt,
  };
}

/**
 * Six entries whose input order is deliberately not the display order.
 * Display order: m6, m3, m4, m2, m1, m5.
 */
function makeLogs(): GoalLog[] {
  return [
    makeLog('m1', 'm1', DateTime.local(2026, 3, 9, 9), 10),
    makeLog('m2', 'm2', DateTime.local(2026, 3, 10, 9), 20),
    makeLog('m3', 'm3', DateTime.local(2026, 3, 10, 10), 40),
    makeLog('m4', 'm4', DateTime.local(2026, 3, 10, 11), 30),
    makeLog('m5', 'm5', DateTime.local(2026, 3, 8, 9), 5),
    makeLog('m6', 'm6', DateTime.local(2026, 3, 11, 9), 1),
  ];
}

describe('GoalLogList', () => {
  it('caps entries in display order and counts only the visible entries per day', () => {
    render(<GoalLogList logs={makeLogs()} maxEntries={3} />);

    // First three in display order: m6 (Mar 11), then m3 and m4 (Mar 10).
    expect(screen.getByText('m6')).toBeInTheDocument();
    expect(screen.getByText('m3')).toBeInTheDocument();
    expect(screen.getByText('m4')).toBeInTheDocument();

    // Everything after the cap is absent.
    expect(screen.queryByText('m1')).not.toBeInTheDocument();
    expect(screen.queryByText('m2')).not.toBeInTheDocument();
    expect(screen.queryByText('m5')).not.toBeInTheDocument();

    // Mar 11 keeps 1 visible entry, Mar 10 keeps 2. No other day groups are rendered.
    expect(screen.getByText('(1 entry)')).toBeInTheDocument();
    expect(screen.getByText('(2 entries)')).toBeInTheDocument();
    expect(screen.getAllByText(/\(\d+ entr(y|ies)\)/)).toHaveLength(2);
  });

  it('shows all entries when maxEntries is omitted', () => {
    render(<GoalLogList logs={makeLogs()} />);

    for (const content of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']) {
      expect(screen.getByText(content)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/\(\d+ entr(y|ies)\)/)).toHaveLength(4);
  });

  it('renders the edit form in the edited entry slot and keeps list order', () => {
    const logs = makeLogs();
    const m3Id = 'm3' as Id<'goalLogs'>;

    render(
      <GoalLogList
        logs={logs}
        editingLogId={m3Id}
        renderEditForm={(log) => <div>editing {log.content}</div>}
      />
    );

    const editPlaceholder = screen.getByText(/^editing /);
    expect(editPlaceholder).toBeInTheDocument();
    expect(editPlaceholder.textContent).toContain('<p>m3</p>');

    // The edited entry no longer renders as a normal read-only entry.
    expect(screen.queryByText('m3')).not.toBeInTheDocument();

    // Siblings still render, and order is preserved around the edit slot.
    const m2 = screen.getByText('m2');
    const m4 = screen.getByText('m4');
    expect(m4.compareDocumentPosition(m2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the empty state when there are no logs', () => {
    render(<GoalLogList logs={[]} />);
    expect(screen.getByText('No log entries yet')).toBeInTheDocument();
  });
});
