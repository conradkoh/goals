import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FakeBackend } from '../__testing__/fakeBackend.js';
import { createFakeBackend } from '../__testing__/fakeBackend.js';
import type { Harness } from '../__testing__/harness.js';
import { createHarness } from '../__testing__/harness.js';

function readSkillFile(name: 'SKILL.md' | 'REFERENCE.md'): string {
  return readFileSync(new URL(`../../skills/goals-cli/${name}`, import.meta.url), 'utf8');
}

function manifestVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  ) as { version: string };
  return manifest.version;
}

describe('goals skill activate', () => {
  let backend: FakeBackend;
  let harness: Harness;

  beforeEach(() => {
    backend = createFakeBackend({ now: () => harness.clock.now });
    harness = createHarness(backend);
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('prints the skill while logged out, with no network call and no file written', async () => {
    const result = await harness.run(['skill', 'activate'], { env: {} });

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(backend.requests).toEqual([]);
    expect(existsSync(harness.credentialsPath)).toBe(false);
    expect(readdirSync(harness.dir)).toEqual([]);
  });

  it('lays out the guidance, the fenced stub, the separator and the reference', async () => {
    const stub = readSkillFile('SKILL.md');
    const reference = readSkillFile('REFERENCE.md');

    const result = await harness.run(['skill', 'activate']);

    expect(result.code).toBe(0);
    expect(result.stdout.startsWith(`Goals CLI ${manifestVersion()} - agent skill\n`)).toBe(true);

    const guidanceAt = result.stdout.indexOf('Save the stub below');
    const stubAt = result.stdout.indexOf(stub.trim());
    const fenceAt = result.stdout.indexOf('```markdown\n');
    const separatorAt = result.stdout.indexOf('\n---\n', stubAt);
    const referenceAt = result.stdout.indexOf(reference.trim());

    expect(guidanceAt).toBeGreaterThanOrEqual(0);
    expect(fenceAt).toBeGreaterThanOrEqual(0);
    expect(guidanceAt).toBeLessThan(stubAt);
    expect(stubAt).toBeLessThan(separatorAt);
    expect(separatorAt).toBeLessThan(referenceAt);
    expect(result.stdout).toContain(`\`\`\`markdown\n${stub.trim()}\n\`\`\`\n`);
    expect(result.stdout.endsWith('\n')).toBe(true);
  });

  it('ships a stub with frontmatter and no fence of its own', () => {
    const stub = readSkillFile('SKILL.md');

    expect(stub).toMatch(/^---\nname: goals-cli\ndescription: .+\n---\n/);
    expect(stub).not.toContain('```');
  });

  it.each([['extra'], ['--extra']])('rejects the extra argument %s', async (extra) => {
    const result = await harness.run(['skill', 'activate', extra]);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Usage: goals skill activate\n');
  });

  it('rejects a bare skill family', async () => {
    const result = await harness.run(['skill']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith('Usage: goals skill <action>')).toBe(true);
  });

  it('rejects an unknown skill action', async () => {
    const result = await harness.run(['skill', 'nope']);

    expect(result.code).toBe(2);
    expect(result.stderr.startsWith("Usage: unknown action 'nope'")).toBe(true);
  });
});
