import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const requireFromHere = createRequire(import.meta.url);
const distEntry = join(packageRoot, 'dist', 'cli.js');

const sandboxes: string[] = [];

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Sandbox {
  root: string;
  binPath: string;
  env: NodeJS.ProcessEnv;
  home: string;
  xdg: string;
  appdata: string;
}

function golden(name: string): string {
  return readFileSync(join(packageRoot, 'src', '__views__', `${name}.txt`), 'utf8');
}

function manifest(): { version: string; dependencies?: unknown } {
  return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
    version: string;
    dependencies?: unknown;
  };
}

function createSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'goals-cli-bin-'));
  sandboxes.push(root);
  const binDir = join(root, 'bin');
  const home = join(root, 'home');
  const xdg = join(root, 'xdg');
  const appdata = join(root, 'appdata');
  for (const dir of [binDir, home, xdg, appdata]) mkdirSync(dir, { recursive: true });
  const binPath = join(binDir, 'goals');
  symlinkSync(distEntry, binPath);
  return {
    root,
    binPath,
    home,
    xdg,
    appdata,
    env: { ...process.env, HOME: home, XDG_CONFIG_HOME: xdg, APPDATA: appdata },
  };
}

function runScript(script: string, args: string[], sandbox: Sandbox): RunResult {
  const result = spawnSync(process.execPath, [script, ...args], {
    env: sandbox.env,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? listFiles(path).map((file) => join(entry.name, file))
      : [entry.name];
  });
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [requireFromHere.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'],
    {
      cwd: packageRoot,
      stdio: 'pipe',
    }
  );
}, 120_000);

afterAll(() => {
  for (const root of sandboxes) rmSync(root, { recursive: true, force: true });
});

describe('the built binary', () => {
  it('answers --version and --help through a bin symlink', () => {
    const sandbox = createSandbox();

    const version = runScript(sandbox.binPath, ['--version'], sandbox);
    expect(version.status).toBe(0);
    expect(version.stdout).toBe(`${manifest().version}\n`);
    expect(version.stderr).toBe('');

    const rootHelp = runScript(sandbox.binPath, ['--help'], sandbox);
    expect(rootHelp.status).toBe(0);
    expect(rootHelp.stdout).toBe(golden('root-help'));
    expect(rootHelp.stderr).toBe('');

    const authHelp = runScript(sandbox.binPath, ['auth', '--help'], sandbox);
    expect(authHelp.status).toBe(0);
    expect(authHelp.stdout).toBe(golden('auth-help'));

    const loginHelp = runScript(sandbox.binPath, ['auth', 'login', '--help'], sandbox);
    expect(loginHelp.status).toBe(0);
    expect(loginHelp.stdout).toBe(golden('auth-login-help'));
  });

  it('behaves the same when dist/cli.js runs directly', () => {
    const sandbox = createSandbox();

    const version = runScript(distEntry, ['--version'], sandbox);
    expect(version.status).toBe(0);
    expect(version.stdout).toBe(`${manifest().version}\n`);

    const help = runScript(distEntry, ['--help'], sandbox);
    expect(help.status).toBe(0);
    expect(help.stdout).toBe(golden('root-help'));
  });

  it('exits 2 with a usage line for an unknown command', () => {
    const sandbox = createSandbox();

    const result = runScript(sandbox.binPath, ['nope'], sandbox);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.split('\n')[0]?.startsWith('Usage: ')).toBe(true);
  });

  it('touches no credential file for help or version', () => {
    const sandbox = createSandbox();

    runScript(sandbox.binPath, ['--version'], sandbox);
    runScript(sandbox.binPath, ['--help'], sandbox);
    runScript(sandbox.binPath, ['auth', 'login', '--help'], sandbox);

    expect(listFiles(sandbox.home)).toEqual([]);
    expect(listFiles(sandbox.xdg)).toEqual([]);
    expect(listFiles(sandbox.appdata)).toEqual([]);
  });

  it('packs only the built output and a dependency-free manifest', () => {
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });
    const [pack] = JSON.parse(raw) as { files: { path: string }[] }[];
    const paths = (pack?.files ?? []).map((file) => file.path);

    expect(paths).toContain('dist/cli.js');
    expect(paths).toContain('package.json');
    for (const path of paths) {
      expect(
        path === 'package.json' ||
          path === 'README.md' ||
          path === 'CHANGELOG.md' ||
          path.startsWith('dist/') ||
          path.startsWith('skills/')
      ).toBe(true);
      expect(path.startsWith('src/')).toBe(false);
      expect(path.includes('.spec.')).toBe(false);
      expect(path.includes('__testing__')).toBe(false);
    }
    expect(readFileSync(distEntry, 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(manifest().dependencies).toBeUndefined();
  });
});
