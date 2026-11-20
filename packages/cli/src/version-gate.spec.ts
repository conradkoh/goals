import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * Runs `scripts/version-gate.mjs` the way CI does: as a subprocess whose inputs are environment
 * variables and whose outputs are `GITHUB_OUTPUT` and stdout. The script is deliberately never
 * imported so the TypeScript build does not have to type the JavaScript module.
 */

const SCRIPT_PATH = fileURLToPath(new URL('../scripts/version-gate.mjs', import.meta.url));

const tempDirs: string[] = [];

interface GateResult {
  /** Exit code, or `null` when the process was killed by a signal. */
  status: number | null;
  stdout: string;
  stderr: string;
  /** Contents of the `GITHUB_OUTPUT` file after the run. */
  output: string;
}

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'goals-gate-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Runs the gate with a synthetic `package.json` whose version is `local`, and with `npmVersion`
 * in `NPM_VERSION`. `extraEnv` can override or unset (`undefined`) any environment variable.
 */
function runGate(
  local: string,
  npmVersion: string | undefined,
  extraEnv: Record<string, string | undefined> = {}
): GateResult {
  const dir = makeTempDir();
  const packagePath = join(dir, 'package.json');
  const outputPath = join(dir, 'github-output.txt');
  writeFileSync(packagePath, `${JSON.stringify({ name: 'goals-cli', version: local })}\n`);
  writeFileSync(outputPath, '');

  const env: Record<string, string | undefined> = {
    ...process.env,
    LOCAL_PACKAGE: packagePath,
    NPM_VERSION: npmVersion,
    GITHUB_OUTPUT: outputPath,
    ...extraEnv,
  };
  if (env.NPM_VERSION === undefined) delete env.NPM_VERSION;
  if (env.GITHUB_OUTPUT === undefined) delete env.GITHUB_OUTPUT;

  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    env: env as NodeJS.ProcessEnv,
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '',
  };
}

describe('version-gate', () => {
  // Pairs where the local version is strictly newer than the published one.
  const PUBLISH_CASES: [string, string][] = [
    ['0.1.1', '0.1.0'],
    ['0.2.0', '0.1.9'],
    ['1.0.0', '0.9.9'],
    ['0.1.0', '0.0.0'],
    ['0.1.0', '0.1.0-rc.1'],
    ['1.0.0', '1.0.0-rc.1'],
    ['1.0.0-rc.2', '1.0.0-rc.1'],
    ['1.0.0-rc.10', '1.0.0-rc.9'],
    ['1.0.0-rc.1', '1.0.0-beta.9'],
    ['1.0.0-alpha.1', '1.0.0-alpha'],
    ['1.0.0-alpha', '1.0.0-1'],
  ];

  it.each(PUBLISH_CASES)('publishes %s when npm has %s', (local, npmVersion) => {
    const result = runGate(local, npmVersion);

    expect(result.status).toBe(0);
    expect(result.output).toBe(`should_publish=true\nversion=${local}\n`);
    expect(result.stdout).toContain(
      `goals-cli ${local} is newer than npm ${npmVersion}; publishing`
    );
  });

  // Pairs where publishing must be skipped: equal, older, prerelease below release, metadata-only.
  const SKIP_CASES: [string, string][] = [
    ['0.1.0', '0.1.0'],
    ['0.1.0', '0.2.0'],
    ['0.1.0-rc.1', '0.1.0'],
    ['1.0.0-rc.1', '1.0.0'],
    ['0.1.0', '1.0.0'],
    ['0.1.0+build.5', '0.1.0'],
    ['0.1.0', '0.1.0+build.9'],
  ];

  it.each(SKIP_CASES)('skips %s when npm has %s', (local, npmVersion) => {
    const result = runGate(local, npmVersion);

    expect(result.status).toBe(0);
    expect(result.output).toBe(`should_publish=false\nversion=${local}\n`);
    expect(result.stdout).toContain(
      `goals-cli ${local} is not newer than npm ${npmVersion}; nothing to publish`
    );
  });

  it('ignores the trailing newline that npm view prints', () => {
    const result = runGate('0.1.1', '0.1.0\n');

    expect(result.status).toBe(0);
    expect(result.output).toBe('should_publish=true\nversion=0.1.1\n');
  });

  it('writes the outputs to stdout when GITHUB_OUTPUT is unset', () => {
    const result = runGate('0.1.1', '0.1.0', { GITHUB_OUTPUT: undefined });

    expect(result.status).toBe(0);
    expect(result.output).toBe('');
    expect(result.stdout).toContain('should_publish=true\nversion=0.1.1\n');
  });

  const INVALID_NPM_VERSIONS = ['not-a-version', '1.0', 'v1.0.0', '01.0.0', '1.0.0-'];

  it.each(INVALID_NPM_VERSIONS)('rejects the npm version %j', (npmVersion) => {
    const result = runGate('0.1.0', npmVersion);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid semver');
    expect(result.output).toBe('');
  });

  it('rejects an invalid local package version', () => {
    const result = runGate('latest', '0.1.0');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid semver');
    expect(result.output).toBe('');
  });

  it('fails when NPM_VERSION is missing', () => {
    const result = runGate('0.1.0', undefined);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NPM_VERSION');
    expect(result.output).toBe('');
  });

  it('fails when NPM_VERSION is empty', () => {
    const result = runGate('0.1.0', '');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NPM_VERSION');
    expect(result.output).toBe('');
  });
});
