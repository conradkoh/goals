import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve(__dirname, '../../../.env.local');

/**
 * Reads a single key from the webapp's .env.local file.
 * Parsing mirrors `getPort()` in playwright.config.ts: comment/blank-line aware,
 * trims whitespace, and ignores malformed lines.
 */
function readEnvValue(key: string): string | undefined {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const lineKey = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (lineKey === key) return value;
    }
  } catch {
    // .env.local not found
  }
  return undefined;
}

export function getConvexUrl(): string {
  const url = readEnvValue('NEXT_PUBLIC_CONVEX_URL');
  if (!url) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not found in apps/webapp/.env.local');
  }
  return url;
}
