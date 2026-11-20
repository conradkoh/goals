/** Test helpers for the checked-in skill reference. Not part of the published build. */

/** True when `line` opens or closes a fenced code block, whatever its language tag. */
function fenceLanguage(line: string): string | undefined {
  const match = /^```(\S*)$/.exec(line.trim());
  return match === null ? undefined : (match[1] ?? '');
}

/**
 * Every command line from the `bash` fences of a markdown document, one entry per line.
 *
 * Blank lines and `#` comments are skipped. Every other line must start with `goals `,
 * otherwise the document is malformed and this throws.
 */
export function extractGoalsCommands(markdown: string): string[] {
  const commands: string[] = [];
  let inBash = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const language = fenceLanguage(line);
    if (language !== undefined) {
      inBash = inBash ? false : language === 'bash';
      continue;
    }
    if (!inBash) continue;
    if (line === '' || line.startsWith('#')) continue;
    if (!line.startsWith('goals ')) {
      throw new Error(`bash fence line is not a goals command: ${JSON.stringify(raw)}`);
    }
    commands.push(line);
  }
  return commands;
}

type Quote = '"' | "'";

/**
 * Shell-like split: whitespace separated, honours "double" and 'single' quotes, no escapes or
 * variables. The first token must be `goals`; the returned argv omits it. An unterminated
 * quote throws.
 */
export function tokenize(commandLine: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let quote: Quote | undefined;

  for (const char of commandLine) {
    if (quote !== undefined) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += char;
    started = true;
  }

  if (quote !== undefined) throw new Error(`unterminated ${quote} quote: ${commandLine}`);
  if (started) tokens.push(current);

  const [command, ...argv] = tokens;
  if (command !== 'goals') {
    throw new Error(`command does not start with goals: ${commandLine}`);
  }
  return argv;
}
