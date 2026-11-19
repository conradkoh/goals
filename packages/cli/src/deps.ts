import { hostname } from 'node:os';

import type { CredentialStoreOptions } from './credentials.js';
import type { ApiClient } from './http.js';
import { openBrowserBestEffort } from './open-browser.js';

export interface OutputPort {
  write(text: string): void;
}

/**
 * Every side effect the CLI has, behind one object: production uses `defaultDeps()`, specs
 * pass overrides to `runCli`. No module-level mocking is needed anywhere else.
 */
export interface CliDeps {
  stdout: OutputPort;
  stderr: OutputPort;
  env: NodeJS.ProcessEnv;
  fetch: typeof fetch;
  now: () => number;
  /** Resolves after `ms`, or immediately (never rejects) when `signal` aborts. */
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  openBrowser: (url: string) => Promise<boolean>;
  hostname: () => string;
  /** Registers a SIGINT handler; returns the unregister function. */
  onSigint: (handler: () => void) => () => void;
  storeOptions: CredentialStoreOptions;
  /** Per-request timeout for the API client (default 30000). */
  timeoutMs?: number;
}

export interface CommandContext {
  deps: CliDeps;
  api: ApiClient;
}

/** `setTimeout` as a promise that also settles early (without rejecting) on abort. */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}

function onSigint(handler: () => void): () => void {
  process.once('SIGINT', handler);
  return () => {
    process.removeListener('SIGINT', handler);
  };
}

export function defaultDeps(): CliDeps {
  return {
    stdout: {
      write: (text) => {
        process.stdout.write(text);
      },
    },
    stderr: {
      write: (text) => {
        process.stderr.write(text);
      },
    },
    env: process.env,
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: abortableSleep,
    openBrowser: (url) => openBrowserBestEffort(url),
    hostname: () => hostname(),
    onSigint,
    storeOptions: {},
  };
}
