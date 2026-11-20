import type { CommandFamilyHelp } from '../help.js';

/** Help data for the `initiative` family; pinned by `src/__views__/initiative-*-help.txt`. */
export const initiativeHelp: CommandFamilyHelp = {
  name: 'initiative',
  summary: 'Read your initiatives.',
  actions: {
    list: {
      summary: 'List initiatives.',
      usage: 'goals initiative list [--limit <n>] [--json] [--as <label>]',
      options: [
        { syntax: '--limit <n>', description: 'Maximum rows, 1-500 (default: 200).' },
        { syntax: '--json', description: 'Print a JSON array instead of a table.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: ['goals initiative list', 'goals initiative list --json'],
      notes: [
        'An empty list prints `No initiatives found.`; --json prints a bare array.',
        'The default cap is 200 (--limit max 500); a truncation note goes to stderr.',
      ],
    },
    get: {
      summary: 'Show one initiative and the goals tagged with it.',
      usage: 'goals initiative get <id> [--json] [--as <label>]',
      options: [
        {
          syntax: '<id>',
          description: 'Initiative ID from `goals initiative list` (use --json for scripts).',
        },
        { syntax: '--json', description: 'Print one JSON object instead of text.' },
        { syntax: '--as <label>', description: 'Identity to use (default: the default identity).' },
      ],
      examples: ['goals initiative get init_123', 'goals initiative get init_123 --json'],
      notes: [
        'IDs come from `goals initiative list` (use --json for scripts).',
        'The goals table lists goals tagged with the initiative, quarterly first.',
      ],
    },
  },
};
