import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CLI_OP_NAMES } from './index';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const sourceFiles = readdirSync(DIR)
  .filter((file) => file.endsWith('.ts'))
  .filter((file) => !file.endsWith('.test.ts'))
  .sort();

/** Every module specifier in a source file. */
const moduleSpecifiers = (source: string): string[] => {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    specifiers.push(match[1]);
  }
  return specifiers;
};

const BANNED_IDENTIFIERS = ['zod', 'convex', '@workspace', 'window', 'document'];

/** The ten op names, alphabetically. */
const OP_NAMES = [
  'auth.whoami',
  'export.quarterSummary',
  'goal.create',
  'goal.delete',
  'goal.get',
  'goal.list',
  'goal.rename',
  'goal.setComplete',
  'initiative.get',
  'initiative.list',
];

describe('cli-contract module purity', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)('%s only uses relative extensionless file imports', (file) => {
    const source = readFileSync(path.join(DIR, file), 'utf8');
    const specifiers = moduleSpecifiers(source);
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(specifier).toMatch(/^\.{1,2}\/[A-Za-z0-9_./-]+$/);
      expect(specifier).not.toMatch(/\.(ts|js|mjs|cjs)$/);
    }
  });

  it.each(sourceFiles)('%s only has type-only imports', (file) => {
    const source = readFileSync(path.join(DIR, file), 'utf8');
    expect(source).not.toMatch(/^\s*import\s+(?!type\s)/m);
  });

  it.each(sourceFiles)('%s does not reference zod, convex or the DOM', (file) => {
    const source = readFileSync(path.join(DIR, file), 'utf8');
    for (const banned of BANNED_IDENTIFIERS) {
      expect(source).not.toContain(banned);
    }
  });
});

describe('CLI_OP_NAMES', () => {
  it('lists exactly the ten sorted op names', () => {
    expect(CLI_OP_NAMES).toEqual(OP_NAMES);
  });

  it('has no duplicates', () => {
    expect(new Set(CLI_OP_NAMES).size).toBe(CLI_OP_NAMES.length);
  });
});
