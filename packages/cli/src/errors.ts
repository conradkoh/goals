/** A failure of the user's environment or the backend (credentials, auth, network); exit code 1. */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** A misuse of the command line; exit code 2. The message always starts with `Usage:`. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message.startsWith('Usage:') ? message : `Usage: ${message}`);
    this.name = 'UsageError';
  }
}

const SECRET_WORDS = /token|bearer|secret|device|handle|checksum/i;

/** The first line of `message` when it is safe to show, else `undefined`. */
function safeLine(message: string): string | undefined {
  const line = message.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return line === '' || SECRET_WORDS.test(line) ? undefined : line;
}

/**
 * First line of `message` when it is non-empty and mentions no secret-ish word, else `fallback`.
 * Used for every backend- or exception-derived text that reaches the terminal.
 */
export function safeMessage(message: unknown, fallback: string): string {
  if (typeof message !== 'string') return fallback;
  return safeLine(message) ?? fallback;
}
