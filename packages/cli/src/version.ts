import { readFileSync } from 'node:fs';

/** The package version, read from `../package.json` relative to this module (works from `src/` and `dist/`). */
export function readCliVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as {
    version?: unknown;
  };
  if (typeof manifest.version !== 'string' || manifest.version === '') {
    throw new Error('goals-cli package.json is missing a version');
  }
  return manifest.version;
}
