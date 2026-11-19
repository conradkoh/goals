import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runCli } from '../cli.js';
import type { CliDeps } from '../deps.js';
import type { FakeBackend } from './fakeBackend.js';

const START_TIME = Date.UTC(2026, 0, 1);

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface Harness {
  /** mkdtemp root; credentials at `<dir>/config/goals/credentials.json`. */
  dir: string;
  credentialsPath: string;
  clock: { now: number };
  sleeps: number[];
  browserUrls: string[];
  sigint: { trigger(): void };
  run(argv: string[], overrides?: Partial<CliDeps>): Promise<RunResult>;
  cleanup(): void;
}

/**
 * A throwaway home plus every `CliDeps` port wired to in-memory recorders, so a spec drives
 * the real `runCli` with the fake backend and no process-level side effects.
 */
export function createHarness(backend: FakeBackend, overrides: Partial<CliDeps> = {}): Harness {
  const dir = mkdtempSync(join(tmpdir(), 'goals-cli-'));
  const credentialsPath = join(dir, 'config', 'goals', 'credentials.json');
  const clock = { now: START_TIME };
  const sleeps: number[] = [];
  const browserUrls: string[] = [];
  const handlers = new Set<() => void>();
  let stdout = '';
  let stderr = '';

  const deps: CliDeps = {
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
    now: () => clock.now,
    sleep: async (ms, signal) => {
      sleeps.push(ms);
      if (signal.aborted) return;
      clock.now += ms;
    },
    openBrowser: async (url) => {
      browserUrls.push(url);
      return true;
    },
    hostname: () => 'test-host',
    onSigint: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    storeOptions: { filePath: credentialsPath },
    ...overrides,
  };

  return {
    dir,
    credentialsPath,
    clock,
    sleeps,
    browserUrls,
    sigint: {
      trigger: () => {
        for (const handler of [...handlers]) handler();
      },
    },
    run: async (argv, runOverrides = {}) => {
      stdout = '';
      stderr = '';
      const code = await runCli(argv, { ...deps, ...runOverrides });
      return { code, stdout, stderr };
    },
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
