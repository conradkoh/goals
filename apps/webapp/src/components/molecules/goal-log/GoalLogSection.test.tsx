import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalLog } from '@workspace/backend/convex/goalLogs';
import { DateTime } from 'luxon';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { GoalLogSection } from './GoalLogSection';

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

// Textarea stand-in for the rich text editor: value is plain text, onChange wraps it in <p>.
vi.mock('@/components/ui/rich-text-editor', () => ({
  isHTMLEmpty: (html: string) => html.replace(/<[^>]*>/g, '').trim() === '',
  stripTrailingEmptyParagraphs: (html: string) => html,
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea
      aria-label="Content"
      value={value.replace(/<[^>]*>/g, '')}
      onChange={(e) => onChange(`<p>${e.target.value}</p>`)}
    />
  ),
}));

beforeAll(() => {
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function makeLog(day: number, createdAt?: number): GoalLog {
  return {
    _id: `log${day}` as Id<'goalLogs'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    goalId: 'goals:test' as Id<'goals'>,
    rootGoalId: 'goals:test' as Id<'goals'>,
    logDate: DateTime.local(2026, 3, day, 9).toMillis(),
    content: `<p>log-${day}</p>`,
    createdAt: createdAt ?? day,
  };
}

function makeLogs(days: number[]): GoalLog[] {
  return days.map((day) => makeLog(day));
}

/** An entry as the save mocks store it, with an explicit id, date, content and createdAt. */
function makeSavedLog(id: string, logDate: number, content: string, createdAt: number): GoalLog {
  return {
    _id: id as Id<'goalLogs'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    goalId: 'goals:test' as Id<'goals'>,
    rootGoalId: 'goals:test' as Id<'goals'>,
    logDate,
    content,
    createdAt,
  };
}

/**
 * A create mock that stores the new entry, so the hooks mock returns it on the next render.
 * The stored entry gets createdAt 100, newer than every entry in these tests.
 */
function makeStoringCreate(logs: GoalLog[]): ReturnType<typeof vi.fn> {
  const createLog = vi.fn(async (logDate: number, content: string) => {
    logs.push(makeSavedLog('new', logDate, content, 100));
    setLogs({ logs: [...logs], createLog });
    return null;
  });
  return createLog;
}

/**
 * An update mock that stores the patch on the matching entry, so the hooks mock returns the
 * saved entry on the next render. The entry keeps its createdAt.
 */
function makeStoringUpdate(logs: GoalLog[]): ReturnType<typeof vi.fn> {
  const updateLog = vi.fn(
    async (id: Id<'goalLogs'>, patch: { logDate?: number; content?: string }) => {
      const index = logs.findIndex((log) => log._id === id);
      const previous = logs[index];
      if (!previous) throw new Error(`unknown log ${id}`);
      logs[index] = makeSavedLog(
        id,
        patch.logDate ?? previous.logDate,
        patch.content ?? previous.content,
        previous.createdAt
      );
      setLogs({ logs: [...logs], updateLog });
      return undefined;
    }
  );
  return updateLog;
}

/**
 * Picks a day in an open Calendar popover. The calendar opens on the current month, so it
 * walks back month by month until the requested day button renders.
 */
async function pickDay(user: ReturnType<typeof userEvent.setup>, dayLabel: RegExp) {
  for (let months = 0; months < 12; months++) {
    const day = screen.queryByRole('button', { name: dayLabel });
    if (day) {
      await user.click(day);
      return;
    }
    await user.click(screen.getByRole('button', { name: 'Go to the Previous Month' }));
  }
  throw new Error(`calendar day ${dayLabel} not reachable`);
}

interface SetLogsOptions {
  logs: GoalLog[] | undefined;
  rootGoalId?: Id<'goals'>;
  hasCarryOverHistory?: boolean;
  isLoading?: boolean;
  createLog?: ReturnType<typeof vi.fn>;
  updateLog?: ReturnType<typeof vi.fn>;
  deleteLog?: ReturnType<typeof vi.fn>;
  fullLogs?: GoalLog[];
}

function setLogs({
  logs,
  rootGoalId,
  hasCarryOverHistory = false,
  isLoading = false,
  createLog,
  updateLog,
  deleteLog,
  fullLogs,
}: SetLogsOptions) {
  hooks.useGoalLogs.mockReturnValue({
    logs,
    rootGoalId,
    hasCarryOverHistory,
    isLoading,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createLog: createLog ?? vi.fn().mockResolvedValue(null),
    updateLog: updateLog ?? vi.fn().mockResolvedValue(undefined),
    deleteLog: deleteLog ?? vi.fn(),
  });
  hooks.useGoalLogsByRootGoal.mockReturnValue({
    logs: rootGoalId ? fullLogs : undefined,
    isLoading: false,
  });
}

describe('GoalLogSection', () => {
  it('renders a plain Log heading and no tabs', () => {
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Log/ })).toBeInTheDocument();
  });

  it('shows 5 of 7 entries with Show all', () => {
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.getByText('log-7')).toBeInTheDocument();
    expect(screen.getByText('log-3')).toBeInTheDocument();
    expect(screen.queryByText('log-2')).not.toBeInTheDocument();
    expect(screen.queryByText('log-1')).not.toBeInTheDocument();

    expect(screen.getByText('Showing 5 of 7 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all (7)' })).toBeInTheDocument();
  });

  it('expands and collapses the capped list', async () => {
    const user = userEvent.setup();
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Show all (7)' }));

    expect(screen.getByText('log-2')).toBeInTheDocument();
    expect(screen.getByText('log-1')).toBeInTheDocument();
    expect(screen.getByText('Showing all 7 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show fewer' }));

    expect(screen.queryByText('log-2')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 5 of 7 entries')).toBeInTheDocument();
  });

  it('hides the footer at 5 or fewer entries and shows the empty state', () => {
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5]) });
    const { unmount } = render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
    unmount();

    setLogs({ logs: [] });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.getByText('No log entries yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });

  it('renders the add control as the first button', () => {
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName('Add log entry...');
  });

  it('creates once, collapses, and returns focus to the add trigger', async () => {
    const user = userEvent.setup();
    const createLog = vi.fn().mockResolvedValue(null);
    setLogs({ logs: makeLogs([1, 2, 3]), createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    await waitFor(() => {
      expect(createLog).toHaveBeenCalledTimes(1);
    });
    expect(createLog).toHaveBeenCalledWith(expect.any(Number), '<p>Shipped</p>');

    const trigger = await screen.findByRole('button', { name: 'Add log entry...' });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('keeps the content and shows the error when a create fails', async () => {
    const user = userEvent.setup();
    const createLog = vi.fn().mockRejectedValue(new Error('Network down'));
    setLogs({ logs: makeLogs([1, 2, 3]), createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(screen.getByLabelText('Content')).toHaveValue('Shipped');
    expect(screen.getByRole('button', { name: 'Add Entry' })).toBeInTheDocument();
  });

  it('auto-expands a capped list when a backdated entry is created', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DateTime.local(2026, 3, 1, 12).toJSDate());
    const logs = makeLogs([2, 3, 4, 5, 6, 7]);
    const createLog = makeStoringCreate(logs);
    setLogs({ logs, createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    expect(await screen.findByText('Shipped')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  it('keeps a backdated create that lands on the 5th display day visible and capped', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DateTime.local(2026, 3, 3, 12).toJSDate());
    const logs = makeLogs([2, 3, 4, 5, 6, 7]);
    const createLog = makeStoringCreate(logs);
    setLogs({ logs, createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    expect(await screen.findByText('Shipped')).toBeInTheDocument();
    expect(screen.queryByText('log-2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show fewer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all (7)' })).toBeInTheDocument();
  });

  it('shows a backdated create below the cap without a footer', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DateTime.local(2026, 2, 20, 12).toJSDate());
    const logs = makeLogs([1, 2, 3]);
    const createLog = makeStoringCreate(logs);
    setLogs({ logs, createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    expect(await screen.findByText('Shipped')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });

  it('keeps a same-day or later create capped', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DateTime.local(2026, 3, 8, 12).toJSDate());
    const createLog = vi.fn().mockResolvedValue(null);
    setLogs({ logs: makeLogs([2, 3, 4, 5, 6, 7]), createLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Shipped');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    await waitFor(() => {
      expect(createLog).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('button', { name: 'Show fewer' })).not.toBeInTheDocument();
  });

  it('expands a capped list when an edit moves an entry older than the 5th display day', async () => {
    const user = userEvent.setup();
    const logs = makeLogs([1, 2, 3, 4, 5, 6, 7]);
    const log7Id = 'log7' as Id<'goalLogs'>;
    const updateLog = makeStoringUpdate(logs);
    setLogs({ logs, updateLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByText('log-7'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /Mar 07, 2026/ }));
    await pickDay(user, /March 1st, 2026/);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledWith(log7Id, {
        logDate: DateTime.local(2026, 3, 1, 9).toMillis(),
        content: '<p>log-7</p>',
      });
    });
    expect(await screen.findByText('log-7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  it('does not expand when an edit keeps the entry in the capped view', async () => {
    const user = userEvent.setup();
    const logs = makeLogs([1, 2, 3, 4, 5, 6, 7]);
    const updateLog = makeStoringUpdate(logs);
    setLogs({ logs, updateLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByText('log-7'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Content'));
    await user.type(screen.getByLabelText('Content'), 'log-7');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('button', { name: 'Show all (7)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show fewer' })).not.toBeInTheDocument();
  });

  it('shows full history without a cap and disables adding', async () => {
    const user = userEvent.setup();
    setLogs({
      logs: makeLogs([1, 2, 3, 4, 5, 6, 7]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Full history' }));

    expect(screen.getByText('log-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show fewer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current only' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch to current view to add entries' })
    ).toBeDisabled();
  });

  it('shows only the list skeleton while loading', () => {
    setLogs({ logs: undefined, isLoading: true });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    expect(screen.getByTestId('goal-log-loading')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add log entry...' })).toBeEnabled();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('edits an entry in place and disables the add trigger', async () => {
    const user = userEvent.setup();
    const onFormActiveChange = vi.fn();
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    await user.click(screen.getByText('log-3'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish editing to add entries' })).toBeDisabled();
    expect(onFormActiveChange).toHaveBeenLastCalledWith(true);
    // The read-only entry paragraph is replaced by the edit form in the same slot.
    expect(screen.queryByText('log-3', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('shows a dismissible banner when saving a checkbox change fails', async () => {
    const user = userEvent.setup();
    const updateLog = vi.fn().mockRejectedValue(new Error('Server unavailable'));
    setLogs({ logs: makeLogs([1, 2, 3]), updateLog });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getAllByRole('button', { name: 'Toggle task' })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save that change. Server unavailable"
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the section root free of scroll and fixed-height utilities', () => {
    setLogs({ logs: makeLogs([1, 2, 3]) });
    const { container } = render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    const root = container.querySelector('[data-slot="goal-log-section"]');
    expect(root).not.toBeNull();

    const classes = root?.className ?? '';
    for (const forbidden of ['overflow', 'max-h', 'h-full', 'flex-1 min-h-0']) {
      expect(classes).not.toContain(forbidden);
    }
  });

  it('reports form active state on expand, cancel and unmount', async () => {
    const user = userEvent.setup();
    const onFormActiveChange = vi.fn();
    setLogs({ logs: makeLogs([1, 2, 3]) });
    const { unmount } = render(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    expect(onFormActiveChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(onFormActiveChange).toHaveBeenLastCalledWith(false);
    });

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    expect(onFormActiveChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onFormActiveChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps an open edit visible when Show fewer would hide its entry', async () => {
    const user = userEvent.setup();
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Show all (7)' }));
    await user.click(screen.getByText('log-1'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const showFewer = screen.getByRole('button', { name: 'Show fewer' });
    expect(showFewer).toHaveAttribute('aria-disabled', 'true');
    expect(showFewer).toHaveAttribute('title', 'Save or cancel the open edit first');
    await user.click(showFewer);

    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish editing to add entries' })).toBeDisabled();
  });

  it('keeps the edit open when a live update pushes its entry below the cap, then closes it when the entry is deleted', async () => {
    const onFormActiveChange = vi.fn();
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7]) });
    const { rerender } = render(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('log-3'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();

    // A newer day arrives: log-3 is now 6th in display order, beyond the cap.
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7, 8]) });
    rerender(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish editing to add entries' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(onFormActiveChange).toHaveBeenLastCalledWith(true);

    // The edited entry is deleted by a live update.
    setLogs({ logs: makeLogs([1, 2, 4, 5, 6, 7, 8]) });
    rerender(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    expect(screen.queryByText('Edit Log Entry')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This entry was deleted, so your edit was discarded.'
    );
    const addTrigger = screen.getByRole('button', { name: 'Add log entry...' });
    expect(addTrigger).toBeEnabled();
    await waitFor(() => {
      expect(onFormActiveChange).toHaveBeenLastCalledWith(false);
      expect(addTrigger).toHaveFocus();
    });
  });

  it('disables Edit on other entries while an edit is open and keeps the open draft', async () => {
    const user = userEvent.setup();
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByText('log-3'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Content'), ' draft');

    await user.click(screen.getByText('log-2'));
    const otherEdit = screen.getByRole('button', { name: 'Edit' });
    expect(otherEdit).toHaveAttribute('aria-disabled', 'true');
    expect(otherEdit).toHaveAttribute('title', 'Save or cancel the open edit first');
    // Stays focusable while unavailable, so a keyboard user can reach the reason.
    otherEdit.focus();
    expect(otherEdit).toHaveFocus();
    await user.click(otherEdit);

    // A click on the disabled Edit must not collapse the row, so the same Edit is still shown.
    expect(otherEdit).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('log-3 draft');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  it('disables Edit on entries while the add form is open and keeps the create draft', async () => {
    const user = userEvent.setup();
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'draft');
    await user.click(screen.getByText('log-3'));

    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Content')).toHaveValue('draft');
    expect(screen.queryByText('Edit Log Entry')).not.toBeInTheDocument();
  });

  it('disables the Full history toggle while an edit is open', async () => {
    const user = userEvent.setup();
    setLogs({
      logs: makeLogs([1, 2, 3]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4]),
    });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByText('log-3'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: 'Full history' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Full history' })).toHaveAttribute(
      'title',
      'Save or cancel the open edit first'
    );
    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();
  });

  it('closes an edit on Cancel and returns focus to the add trigger', async () => {
    const user = userEvent.setup();
    setLogs({ logs: makeLogs([1, 2, 3]) });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByText('log-3'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Edit Log Entry')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add log entry...' })).toHaveFocus();
    });
  });

  it('collapses an open add form when Full history turns on, and it cannot be submitted', async () => {
    const user = userEvent.setup();
    const onFormActiveChange = vi.fn();
    setLogs({
      logs: makeLogs([1, 2, 3]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4]),
    });
    render(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Half-written');
    await user.click(screen.getByRole('button', { name: 'Full history' }));

    expect(screen.queryByLabelText('Content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Entry' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch to current view to add entries' })
    ).toBeDisabled();
    expect(onFormActiveChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps the typed draft and chosen time when the add form reopens in Current only', async () => {
    const user = userEvent.setup();
    setLogs({
      logs: makeLogs([1, 2, 3]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4]),
    });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.type(screen.getByLabelText('Content'), 'Half-written');
    fireEvent.change(document.querySelector('input[type="time"]') as HTMLInputElement, {
      target: { value: '14:30' },
    });

    await user.click(screen.getByRole('button', { name: 'Full history' }));
    await user.click(screen.getByRole('button', { name: 'Current only' }));
    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));

    expect(screen.getByLabelText('Content')).toHaveValue('Half-written');
    expect(document.querySelector('input[type="time"]')).toHaveValue('14:30');
  });

  it('returns focus to the Log heading, not the disabled trigger, when Full history collapses the form', async () => {
    const user = userEvent.setup();
    setLogs({
      logs: makeLogs([1, 2, 3]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4]),
    });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Add log entry...' }));
    await user.click(screen.getByRole('button', { name: 'Full history' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Log/ })).toHaveFocus();
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('returns focus to the Log heading after an edit closes in Full history', async () => {
    const user = userEvent.setup();
    setLogs({
      logs: makeLogs([1, 2, 3]),
      rootGoalId: 'goals:root' as Id<'goals'>,
      hasCarryOverHistory: true,
      fullLogs: makeLogs([1, 2, 3, 4]),
    });
    render(<GoalLogSection goalId={'goals:test' as Id<'goals'>} />);

    await user.click(screen.getByRole('button', { name: 'Full history' }));
    await user.click(screen.getByText('log-4'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Log/ })).toHaveFocus();
    });
  });

  it("keeps an open edit's draft when a live update moves its entry to another day", async () => {
    const user = userEvent.setup();
    const onFormActiveChange = vi.fn();
    setLogs({ logs: makeLogs([1, 2, 3, 4, 5, 6, 7]) });
    const { rerender } = render(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Show all (7)' }));
    await user.click(screen.getByText('log-1'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Content'));
    await user.type(screen.getByLabelText('Content'), 'Reworded');

    // A live update moves the entry being edited to another day, remounting its slot.
    const movedLogs = makeLogs([1, 2, 3, 4, 5, 6, 7]).map((log) =>
      log._id === ('log1' as Id<'goalLogs'>)
        ? { ...log, logDate: DateTime.local(2026, 3, 8, 9).toMillis() }
        : log
    );
    setLogs({ logs: movedLogs });
    rerender(
      <GoalLogSection
        goalId={'goals:test' as Id<'goals'>}
        onFormActiveChange={onFormActiveChange}
      />
    );

    expect(screen.getByText('Edit Log Entry')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('Reworded');
    expect(onFormActiveChange).toHaveBeenLastCalledWith(true);
  });
});
