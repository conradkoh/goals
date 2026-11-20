import { describe, expect, it } from 'vitest';

import { openBrowserBestEffort } from './open-browser.js';

interface SpawnCall {
  command: string;
  args: string[];
}

interface RecordingSpawn {
  calls: SpawnCall[];
  spawn: (command: string, args: string[]) => Promise<void>;
}

function recordingSpawn(): RecordingSpawn {
  const calls: SpawnCall[] = [];
  return {
    calls,
    spawn: async (command, args) => {
      calls.push({ command, args });
    },
  };
}

describe('openBrowserBestEffort', () => {
  it('uses `open` on darwin', async () => {
    const { calls, spawn } = recordingSpawn();

    const opened = await openBrowserBestEffort('https://goals.example.com/cli/authorize', {
      platform: 'darwin',
      spawn,
    });

    expect(opened).toBe(true);
    expect(calls).toEqual([{ command: 'open', args: ['https://goals.example.com/cli/authorize'] }]);
  });

  it('uses `cmd /c start ""` on win32', async () => {
    const { calls, spawn } = recordingSpawn();

    const opened = await openBrowserBestEffort('https://goals.example.com/x', {
      platform: 'win32',
      spawn,
    });

    expect(opened).toBe(true);
    expect(calls).toEqual([
      { command: 'cmd', args: ['/c', 'start', '', 'https://goals.example.com/x'] },
    ]);
  });

  it('uses `xdg-open` elsewhere', async () => {
    const { calls, spawn } = recordingSpawn();

    const opened = await openBrowserBestEffort('http://localhost:3000/cli/authorize', {
      platform: 'linux',
      spawn,
    });

    expect(opened).toBe(true);
    expect(calls).toEqual([{ command: 'xdg-open', args: ['http://localhost:3000/cli/authorize'] }]);
  });

  it('returns false when the spawn rejects', async () => {
    const spawn = async (): Promise<void> => {
      throw new Error('no browser installed');
    };

    await expect(
      openBrowserBestEffort('https://goals.example.com', { platform: 'darwin', spawn })
    ).resolves.toBe(false);
  });

  it('returns false when the spawn throws synchronously', async () => {
    const spawn = (): Promise<void> => {
      throw new Error('cannot spawn');
    };

    await expect(
      openBrowserBestEffort('https://goals.example.com', { platform: 'darwin', spawn })
    ).resolves.toBe(false);
  });

  it('refuses non-http URLs without spawning', async () => {
    const { calls, spawn } = recordingSpawn();

    await expect(
      openBrowserBestEffort('file:///etc/passwd', { platform: 'darwin', spawn })
    ).resolves.toBe(false);
    expect(calls).toEqual([]);
  });
});
