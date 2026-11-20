import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readCliVersion } from './version.js';

describe('readCliVersion', () => {
  it('reads the version from the package manifest', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version?: unknown };

    expect(readCliVersion()).toBe(manifest.version);
  });
});
