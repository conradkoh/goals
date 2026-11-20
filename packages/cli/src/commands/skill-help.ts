import type { CommandFamilyHelp } from '../help.js';

/** Help data for the `skill` family; pinned by `src/__views__/skill-*-help.txt`. */
export const skillHelp: CommandFamilyHelp = {
  name: 'skill',
  summary: 'Print the agent skill that explains this CLI.',
  actions: {
    activate: {
      summary: 'Print the install guidance, the skill stub and the full command reference.',
      usage: 'goals skill activate',
      options: [{ syntax: '--help, -h', description: 'Show this help.' }],
      examples: ['goals skill activate'],
      notes: [
        'Prints to stdout and writes no files.',
        'Makes no network call and works when you are logged out.',
        'Save the printed stub as a skill named goals-cli so your agent can find it.',
      ],
    },
  },
};
