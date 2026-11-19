import type { CommandFamilyHelp } from '../help.js';

/** Help data for the `export` family; pinned by `src/__views__/export-*-help.txt`. */
export const exportHelp: CommandFamilyHelp = {
  name: 'export',
  summary: 'Export your goals as markdown.',
  actions: {
    markdown: {
      summary: 'Print the quarterly summary markdown for a quarter or a year.',
      usage:
        'goals export markdown --year <year> [--quarter <n>] [--completed-only] [--goal <id>]... [--domain <id|uncategorized>]... [--no-adhoc] [--out <file>] [--as <label>]',
      options: [
        { syntax: '--year <year>', description: 'Calendar year, 2000-2100; required.' },
        { syntax: '--quarter <n>', description: 'Quarter 1-4; omit to export the whole year.' },
        {
          syntax: '--completed-only',
          description: "Only completed goals, like the webapp's completed export.",
        },
        {
          syntax: '--goal <id>',
          description: 'Only this quarterly goal; repeatable; needs --quarter.',
        },
        {
          syntax: '--domain <id|uncategorized>',
          description: 'Only adhoc goals in this domain; repeatable.',
        },
        { syntax: '--no-adhoc', description: 'Leave adhoc goals out.' },
        {
          syntax: '--out <file>',
          description: 'Write the markdown to this file instead of stdout.',
        },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: [
        'goals export markdown --year 2026 --quarter 3',
        'goals export markdown --year 2026 --completed-only --out goals-2026.md',
        'goals export markdown --year 2026 --quarter 3 --domain uncategorized',
      ],
      notes: [
        'The output matches the webapp markdown copy for the same selection.',
        'With --quarter you get that quarter document; adhoc goals are included unless --no-adhoc.',
        'With --year alone each quarter appears in order under a year heading, and quarters without goals are listed as `**No goals:**`.',
        '--quarter needs --year.',
        'An empty quarter or year prints an empty-state document and a `No goals found` note on stderr, exit 0.',
        'Markdown goes to stdout; diagnostics go to stderr.',
        '--goal IDs come from `goals goal list`.',
        'An unknown or foreign goal ID fails (exit 1) with nothing written.',
        '--out writes the file only on success.',
      ],
    },
  },
};
