import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const sourceFiles = readdirSync(DIR)
  .filter((file) => file.endsWith('.ts'))
  .filter((file) => !file.endsWith('.test.ts'))
  .sort();

const moduleSpecifiers = (source: string): string[] => {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    specifiers.push(match[1]);
  }
  return specifiers;
};

const BANNED_IDENTIFIERS = ['window', 'document', 'DOMPurify', 'dompurify', 'luxon'];

describe('quarterly-markdown module purity', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)('%s only uses relative extensionless file imports', (file) => {
    const source = readFileSync(path.join(DIR, file), 'utf8');
    const specifiers = moduleSpecifiers(source);
    for (const specifier of specifiers) {
      expect(specifier).toMatch(/^\.\/[A-Za-z0-9_-]+$/);
    }
  });

  it.each(sourceFiles)('%s does not reference DOM, DOMPurify or luxon', (file) => {
    const source = readFileSync(path.join(DIR, file), 'utf8');
    for (const banned of BANNED_IDENTIFIERS) {
      expect(source).not.toContain(banned);
    }
  });

  it('runs without a DOM', () => {
    // @ts-expect-error the shared package deliberately has no DOM lib
    expect(typeof window).toBe('undefined');
    // @ts-expect-error the shared package deliberately has no DOM lib
    expect(typeof document).toBe('undefined');
  });
});
