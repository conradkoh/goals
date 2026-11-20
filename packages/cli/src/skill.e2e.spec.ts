import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { FakeBackend } from './__testing__/fakeBackend.js';
import { createFakeBackend } from './__testing__/fakeBackend.js';
import type { Harness } from './__testing__/harness.js';
import { createHarness } from './__testing__/harness.js';
import { extractGoalsCommands, tokenize } from './__testing__/skillCommands.js';
import type { CliDeps } from './deps.js';

const execFileAsync = promisify(execFile);

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const binary = join(packageRoot, 'dist', 'cli.js');

/** The fake backend's clock stays at the harness start instant. */
const backendClock = { now: Date.UTC(2026, 0, 1) };

interface RunOutput {
  code: number;
  stdout: string;
  stderr: string;
}

interface BuiltModule {
  runCli: (argv: readonly string[], overrides?: Partial<CliDeps>) => Promise<number>;
}

let home = '';
let built: BuiltModule;
let version = '';

function manifestVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as { version: string };
  return manifest.version;
}

function skillFile(name: 'SKILL.md' | 'REFERENCE.md'): string {
  return readFileSync(new URL(`../skills/goals-cli/${name}`, import.meta.url), 'utf8');
}

/** Runs the built entry point as a subprocess with an empty HOME. */
async function runBinary(args: string[]): Promise<RunOutput> {
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    XDG_CONFIG_HOME: '',
    USERPROFILE: home,
    APPDATA: join(home, 'AppData', 'Roaming'),
  };
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binary, ...args], {
      cwd: home,
      env,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === 'number' ? failure.code : 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}

/** The same ports `createHarness` wires, driving the built `runCli` in-process. */
function builtRunner(
  harness: Harness,
  backend: FakeBackend
): (argv: string[]) => Promise<RunOutput> {
  let stdout = '';
  let stderr = '';
  const deps: Partial<CliDeps> = {
    stdout: {
      write: (text) => {
        stdout += text;
      },
    },
    stderr: {
      write: (text) => {
        stderr += text;
      },
    },
    env: {},
    fetch: backend.fetch,
    now: () => harness.clock.now,
    sleep: async (ms) => {
      harness.clock.now += ms;
    },
    openBrowser: async () => true,
    hostname: () => 'test-host',
    onSigint: () => () => undefined,
    storeOptions: { filePath: harness.credentialsPath },
  };
  return async (argv) => {
    stdout = '';
    stderr = '';
    const code = await built.runCli(argv, deps);
    return { code, stdout, stderr };
  };
}

/**
 * A world with the `default` and `dev` identities stored and their server tokens revoked:
 * `goals auth use dev` is a usage error without a stored identity, and revoking the tokens
 * keeps every data command failing before it could write a file.
 */
async function seededWorld(): Promise<{ backend: FakeBackend; harness: Harness }> {
  const backend = createFakeBackend({ now: () => backendClock.now });
  const harness = createHarness(backend);
  const first = await harness.run(['auth', 'login']);
  const second = await harness.run(['auth', 'login', '--name', 'dev', '--env', 'dev']);
  if (first.code !== 0 || second.code !== 0) {
    harness.cleanup();
    throw new Error(`could not seed identities: ${first.stderr}${second.stderr}`);
  }
  for (const issued of backend.issued) {
    if (issued.token !== '') backend.invalidate(issued.token);
  }
  return { backend, harness };
}

beforeAll(async () => {
  execFileSync(
    process.execPath,
    [createRequire(import.meta.url).resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'],
    { cwd: packageRoot }
  );
  built = (await import(pathToFileURL(binary).href)) as BuiltModule;
  version = manifestVersion();
  home = mkdtempSync(join(tmpdir(), 'goals-cli-e2e-'));
}, 120_000);

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('built goals cli', () => {
  it('prints the version from the built entry point', async () => {
    const result = await runBinary(['--version']);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`${version}\n`);
    expect(result.stderr).toBe('');
  });

  it('prints the skill layout with no files written', async () => {
    const stub = skillFile('SKILL.md');
    const reference = skillFile('REFERENCE.md');

    const result = await runBinary(['skill', 'activate']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.startsWith(`Goals CLI ${version} - agent skill\n`)).toBe(true);

    const guidanceAt = result.stdout.indexOf('Save the stub below');
    const stubAt = result.stdout.indexOf(stub.trim());
    // REFERENCE never contains a `---` line, so the last separator is the one after the stub.
    const separatorAt = result.stdout.lastIndexOf('\n---\n');
    const referenceAt = result.stdout.indexOf(reference.trim());

    expect(guidanceAt).toBeGreaterThanOrEqual(0);
    expect(guidanceAt).toBeLessThan(stubAt);
    expect(stubAt).toBeLessThan(separatorAt);
    expect(separatorAt).toBeLessThan(referenceAt);
    expect(result.stdout).toContain(`\`\`\`markdown\n${stub.trim()}\n\`\`\`\n`);
    expect(readdirSync(home)).toEqual([]);
  });

  it('parses every command printed in the reference', async () => {
    const printed = await runBinary(['skill', 'activate']);
    expect(printed.code).toBe(0);

    const separatorAt = printed.stdout.lastIndexOf('\n---\n');
    expect(separatorAt).toBeGreaterThanOrEqual(0);
    const commands = extractGoalsCommands(printed.stdout.slice(separatorAt + '\n---\n'.length));
    expect(commands.length).toBeGreaterThanOrEqual(25);

    for (const command of commands) {
      const { backend, harness } = await seededWorld();
      try {
        const result = await builtRunner(harness, backend)(tokenize(command));

        expect(result.code, `${command}\n${result.stderr}`).not.toBe(2);
        expect(result.stderr.startsWith('Usage:'), command).toBe(false);
      } finally {
        harness.cleanup();
      }
    }

    expect(readdirSync(home)).toEqual([]);
  });

  it('rejects extra arguments with a usage error', async () => {
    const result = await runBinary(['skill', 'activate', 'extra']);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Usage: goals skill activate\n');
  });

  it('logs in with the production endpoints through the built CLI', async () => {
    const backend = createFakeBackend({ now: () => backendClock.now });
    const harness = createHarness(backend);
    try {
      const result = await builtRunner(harness, backend)(['auth', 'login']);

      expect(result.code).toBe(0);
      expect(backend.requests[0]?.method).toBe('POST');
      expect(backend.requests[0]?.url).toBe(
        'https://happy-otter-123.convex.site/cli/auth/requests'
      );
      expect(result.stderr).toContain('Open https://goals-ten.vercel.app/cli/authorize?request=');
    } finally {
      harness.cleanup();
    }
  });
});
