import { UsageError } from './errors.js';

export interface HelpOption {
  syntax: string;
  description: string;
}

export interface CommandActionHelp {
  summary: string;
  /** Starts with `goals ...` */
  usage: string;
  options: readonly HelpOption[];
  examples?: readonly string[];
  notes?: readonly string[];
}

export interface CommandFamilyHelp {
  name: string;
  summary: string;
  actions: Record<string, CommandActionHelp>;
}

function isHelpFlag(token: string): boolean {
  return token === '--help' || token === '-h';
}

/** True when the arguments ask for help; checked before every other interpretation. */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.some(isHelpFlag);
}

/** The leading tokens of `argv` that do not start with `-` (stops at the first flag). */
function leadingWords(argv: readonly string[]): string[] {
  const words: string[] = [];
  for (const token of argv) {
    if (token.startsWith('-')) break;
    words.push(token);
  }
  return words;
}

function padRows(rows: readonly (readonly [string, string])[]): string[] {
  const width = rows.reduce((longest, [left]) => Math.max(longest, left.length), 0);
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`);
}

function renderRootHelp(families: readonly CommandFamilyHelp[]): string {
  const lines = [
    'Usage: goals <command> [options]',
    '',
    'Command-line access to your Goals app data.',
    '',
    'Commands:',
    ...padRows(families.map((family) => [family.name, family.summary] as const)),
    '',
    'Global options:',
    ...padRows([
      ['--help, -h', 'Show help for a command.'],
      ['--version', 'Print the installed version.'],
    ] as const),
    '',
    'Getting started:',
    '  goals auth login',
    '  goals auth status',
    '  goals <command> --help',
  ];
  return `${lines.join('\n')}\n`;
}

function renderFamilyHelp(family: CommandFamilyHelp): string {
  const lines = [
    `Usage: goals ${family.name} <action> [options]`,
    '',
    family.summary,
    '',
    'Actions:',
    ...padRows(
      Object.entries(family.actions).map(([name, action]) => [name, action.summary] as const)
    ),
    '',
    `Run \`goals ${family.name} <action> --help\` for details.`,
  ];
  return `${lines.join('\n')}\n`;
}

function renderActionSections(action: CommandActionHelp): string[] {
  const sections: (readonly [string, readonly string[] | undefined])[] = [
    ['Examples:', action.examples],
    ['Notes:', action.notes],
  ];
  return sections.flatMap(([title, entries]) =>
    entries === undefined || entries.length === 0
      ? []
      : ['', title, ...entries.map((entry) => `  ${entry}`)]
  );
}

function renderActionHelp(action: CommandActionHelp): string {
  const lines = [
    `Usage: ${action.usage}`,
    '',
    action.summary,
    '',
    'Options:',
    ...padRows(action.options.map((option) => [option.syntax, option.description] as const)),
    ...renderActionSections(action),
  ];
  return `${lines.join('\n')}\n`;
}

function findFamily(name: string, families: readonly CommandFamilyHelp[]): CommandFamilyHelp {
  const family = families.find((candidate) => candidate.name === name);
  if (family === undefined) {
    throw new UsageError(`unknown command '${name}'. Run \`goals --help\` for commands.`);
  }
  return family;
}

function findAction(family: CommandFamilyHelp, name: string): CommandActionHelp {
  const action = family.actions[name];
  if (action === undefined) {
    throw new UsageError(
      `unknown action '${name}' for 'goals ${family.name}'. Run \`goals ${family.name} --help\` for actions.`
    );
  }
  return action;
}

/**
 * The help page named by `argv`: no command word → root; one → family; two or more → action.
 * Extra words and flags after the action are ignored. Unknown names are usage errors.
 */
export function resolveHelp(
  argv: readonly string[],
  families: readonly CommandFamilyHelp[]
): string {
  const [familyName, actionName] = leadingWords(argv);
  if (familyName === undefined) return renderRootHelp(families);
  const family = findFamily(familyName, families);
  if (actionName === undefined) return renderFamilyHelp(family);
  return renderActionHelp(findAction(family, actionName));
}
