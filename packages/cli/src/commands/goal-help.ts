import type { CommandFamilyHelp } from '../help.js';

/** Help data for the `goal` family; the text is pinned by `src/__views__/goal-*-help.txt`. */
export const goalHelp: CommandFamilyHelp = {
  name: 'goal',
  summary: 'Read and change your goals.',
  actions: {
    list: {
      summary: 'List goals in one scope for a year (quarterly by default).',
      usage:
        'goals goal list [--scope <scope>] --year <year> [--quarter <n>] [--week <n>] [--initiative <id>] [--limit <n>] [--json] [--as <label>]',
      options: [
        { syntax: '--scope <scope>', description: 'quarterly (default), weekly, daily or adhoc.' },
        {
          syntax: '--year <year>',
          description: 'Calendar year, 2000-2100; required for every scope.',
        },
        {
          syntax: '--quarter <n>',
          description: 'Quarter 1-4; required for quarterly, weekly and daily goals.',
        },
        {
          syntax: '--week <n>',
          description: 'ISO week 1-53; required for weekly and daily goals, optional for adhoc.',
        },
        {
          syntax: '--initiative <id>',
          description:
            'Only goals tagged with this initiative; IDs come from `goals initiative list`.',
        },
        { syntax: '--limit <n>', description: 'Maximum rows, 1-500 (default: 200).' },
        { syntax: '--json', description: 'Print a JSON array instead of a table.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: [
        'goals goal list --year 2026 --quarter 3',
        'goals goal list --scope weekly --year 2026 --quarter 3 --week 31',
        'goals goal list --scope adhoc --year 2026 --json',
      ],
      notes: [
        'Default scope is quarterly; quarterly needs --year and --quarter and rejects --week.',
        'Weekly and daily need --year, --quarter and --week; adhoc needs --year and rejects --quarter.',
        'An empty list prints `No goals found.`; --json prints a bare array.',
        'The default cap is 200 (--limit max 500); a truncation note goes to stderr.',
      ],
    },
    get: {
      summary: 'Show one goal with its parent, children, details and due date.',
      usage: 'goals goal get <id> [--json] [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Goal ID from `goals goal list` (use --json for scripts).',
        },
        { syntax: '--json', description: 'Print one JSON object instead of text.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: ['goals goal get goal_123', 'goals goal get goal_123 --json'],
      notes: [
        'IDs come from `goals goal list` (use --json for scripts).',
        'Details are rich text and are printed as plain text.',
      ],
    },
  },
};
