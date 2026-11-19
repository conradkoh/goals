import type { CommandFamilyHelp } from '../help.js';

/** Help data for the `auth` family; the text is pinned by `src/__views__/auth-*-help.txt`. */
export const authHelp: CommandFamilyHelp = {
  name: 'auth',
  summary: 'Log in, log out and manage identities.',
  actions: {
    login: {
      summary: 'Log in through your browser and store a credential.',
      usage:
        'goals auth login [--name <label>] [--env <qualifier>] [--webapp-url <url> --convex-url <url>]',
      options: [
        {
          syntax: '--name <label>',
          description: 'Name this identity (default: the environment qualifier, else "default").',
        },
        {
          syntax: '--env <qualifier>',
          description: 'Environment qualifier such as "dev"; shown in status and list.',
        },
        {
          syntax: '--webapp-url <url>',
          description: 'Webapp origin used for browser approval. Pass together with --convex-url.',
        },
        {
          syntax: '--convex-url <url>',
          description: 'Goals HTTP origin (the .convex.site URL). Pass together with --webapp-url.',
        },
      ],
      examples: [
        'goals auth login',
        'goals auth login --name dev --env dev --webapp-url http://localhost:3000 --convex-url http://127.0.0.1:3211',
      ],
      notes: [
        'The approval URL and a verification code are printed on stderr; type the code in the browser to approve.',
        'The credential is saved in your user config directory (goals/credentials.json, mode 0600) and is never printed.',
      ],
    },
    logout: {
      summary: 'Revoke the credential and remove it from this machine.',
      usage: 'goals auth logout [--as <label>]',
      options: [
        {
          syntax: '--as <label>',
          description: 'Identity to log out (default: the default identity).',
        },
      ],
      examples: ['goals auth logout', 'goals auth logout --as dev'],
      notes: [
        'The local entry is always removed, even if the server cannot be reached.',
        'Identity selection: --as, then GOALS_AS, then the default identity, then the only stored identity.',
      ],
    },
    status: {
      summary: 'Show the current identity and whether its credential is valid.',
      usage: 'goals auth status [--as <label>] [--json]',
      options: [
        {
          syntax: '--as <label>',
          description: 'Identity to inspect (default: the default identity).',
        },
        { syntax: '--json', description: 'Print one JSON object instead of text.' },
      ],
      examples: ['goals auth status', 'goals auth status --as dev --json'],
      notes: [
        'The credential itself is never shown.',
        'Identity selection: --as, then GOALS_AS, then the default identity, then the only stored identity.',
      ],
    },
    list: {
      summary: 'List stored identities.',
      usage: 'goals auth list [--json]',
      options: [{ syntax: '--json', description: 'Print a JSON array instead of a table.' }],
      examples: ['goals auth list'],
      notes: ['Reads the local file only; no network call. * marks the default identity.'],
    },
    use: {
      summary: 'Set the default identity.',
      usage: 'goals auth use <label>',
      options: [{ syntax: '<label>', description: 'A label shown by `goals auth list`.' }],
      examples: ['goals auth use dev'],
    },
  },
};
