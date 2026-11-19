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
    create: {
      summary: 'Create one quarterly, weekly, daily or adhoc goal.',
      usage:
        'goals goal create --scope <scope> --title <text> [--details <text>] [--year <year>] [--quarter <n>] [--week <n>] [--parent <id>] [--day <day>] [--domain <id>] [--initiative <id>] [--as <label>]',
      options: [
        {
          syntax: '--scope <scope>',
          description: 'quarterly, weekly, daily or adhoc; required.',
        },
        { syntax: '--title <text>', description: 'Goal title, trimmed; required.' },
        {
          syntax: '--details <text>',
          description: 'Rich-text details; printed as plain text by `goals goal get`.',
        },
        {
          syntax: '--year <year>',
          description: 'Calendar year 2000-2100; required for quarterly, defaults for adhoc.',
        },
        {
          syntax: '--quarter <n>',
          description: 'Quarter 1-4; required for quarterly, optional for weekly and daily.',
        },
        {
          syntax: '--week <n>',
          description:
            'ISO week 1-53; defaults to the current ISO week for weekly, daily and adhoc.',
        },
        {
          syntax: '--parent <id>',
          description:
            'Parent ID: a quarterly goal for weekly, a weekly goal for daily, an adhoc goal for adhoc; from `goals goal list --scope <same scope>`.',
        },
        {
          syntax: '--day <day>',
          description: 'Day for daily goals: 1-7 or mon..sun (Monday is 1).',
        },
        {
          syntax: '--domain <id>',
          description:
            'Domain ID (shown as `domainId` in `goals goal get <id> --json`); adhoc only.',
        },
        {
          syntax: '--initiative <id>',
          description: 'Initiative ID from `goals initiative list`.',
        },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: [
        'goals goal create --scope quarterly --year 2026 --quarter 3 --title "Ship the beta"',
        'goals goal create --scope weekly --parent goal_1 --title "Draft the launch"',
        'goals goal create --scope daily --parent goal_2 --day tue --title "Call the printer"',
        'goals goal create --scope adhoc --title "Book the venue" --domain domain_1',
      ],
      notes: [
        'Quarterly needs --year and --quarter and rejects --parent, --day and --domain.',
        'Weekly needs --parent (a quarterly goal) and rejects --day and --domain.',
        'Daily needs --parent (a weekly goal) and --day, and rejects --domain.',
        'Adhoc rejects --quarter and --day; --parent must be an adhoc goal.',
        'Weekly and daily default --week to the current ISO week.',
        'Adhoc defaults --year and --week to the current ISO year and week; another --year needs --week.',
        'Quarterly without --week uses the first week of the quarter (server default).',
        'IDs come from `goals goal list` (use --json for scripts); initiative IDs from `goals initiative list`.',
      ],
    },
    rename: {
      summary: 'Rename one goal.',
      usage: 'goals goal rename <id> --title <text> [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Goal ID from `goals goal list` (use --json for scripts).',
        },
        { syntax: '--title <text>', description: 'New title, trimmed; must not be empty.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: ['goals goal rename goal_123 --title "Ship the beta"'],
      notes: ['IDs come from `goals goal list` (use --json for scripts).'],
    },
    complete: {
      summary: 'Mark one goal complete.',
      usage: 'goals goal complete <id> [--week <n>] [--include-children] [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Goal ID from `goals goal list` (use --json for scripts).',
        },
        {
          syntax: '--week <n>',
          description: 'ISO week 1-53; required for weekly and daily goals.',
        },
        {
          syntax: '--include-children',
          description: 'Also mark child goals complete (off by default).',
        },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: [
        'goals goal complete goal_123 --week 31',
        'goals goal complete goal_123 --include-children',
      ],
      notes: [
        '--week is required for weekly and daily goals; the error names the current ISO week.',
        "Quarterly goals default to the quarter's first week server-side.",
        '--include-children also applies to child goals; it is off by default.',
        "Use `goals goal get <id>` to see a goal's scope.",
        'IDs come from `goals goal list` (use --json for scripts).',
      ],
    },
    reopen: {
      summary: 'Mark one goal incomplete again.',
      usage: 'goals goal reopen <id> [--week <n>] [--include-children] [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Goal ID from `goals goal list` (use --json for scripts).',
        },
        {
          syntax: '--week <n>',
          description: 'ISO week 1-53; required for weekly and daily goals.',
        },
        {
          syntax: '--include-children',
          description: 'Also mark child goals incomplete (off by default).',
        },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: [
        'goals goal reopen goal_123 --week 31',
        'goals goal reopen goal_123 --include-children',
      ],
      notes: [
        '--week is required for weekly and daily goals; the error names the current ISO week.',
        "Quarterly goals default to the quarter's first week server-side.",
        '--include-children also applies to child goals; it is off by default.',
        "Use `goals goal get <id>` to see a goal's scope.",
        'IDs come from `goals goal list` (use --json for scripts).',
      ],
    },
    delete: {
      summary: 'Delete one goal and all of its child goals.',
      usage: 'goals goal delete <id> --yes [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Goal ID from `goals goal list` (use --json for scripts).',
        },
        { syntax: '--yes', description: 'Confirm the deletion; nothing is sent without it.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: ['goals goal delete goal_123 --yes'],
      notes: [
        'Deletes this goal and all of its child goals.',
        '--yes is required and nothing is sent without it.',
        'Goal log history is kept.',
        'IDs come from `goals goal list` (use --json for scripts).',
      ],
    },
  },
};
