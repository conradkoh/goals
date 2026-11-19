import { spawn } from 'node:child_process';

export interface OpenBrowserOptions {
  platform?: NodeJS.Platform;
  spawn?: (command: string, args: string[]) => Promise<void> | void;
}

interface LaunchCommand {
  command: string;
  args: string[];
}

/** Opens `command` detached from this process; resolves on close and rejects on spawn errors. */
function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', shell: false });
    child.once('error', reject);
    child.once('close', () => resolve());
  });
}

/** The OS command that hands `url` to the default browser. */
function launchCommand(platform: NodeJS.Platform, url: string): LaunchCommand {
  if (platform === 'darwin') return { command: 'open', args: [url] };
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', url] };
  return { command: 'xdg-open', args: [url] };
}

/** True only for absolute http(s) URLs; anything else must never be spawned. */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Runs the OS opener; any failure (missing binary, headless box) is a quiet `false`. */
async function launchBrowser(
  launch: LaunchCommand,
  spawn: (command: string, args: string[]) => Promise<void> | void
): Promise<boolean> {
  try {
    await spawn(launch.command, launch.args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort browser launch: returns `true` when the platform opener ran, `false` for a
 * non-http(s) URL or any spawn failure. Never throws, so a headless machine still logs in.
 */
export async function openBrowserBestEffort(
  url: string,
  options: OpenBrowserOptions = {}
): Promise<boolean> {
  if (!isHttpUrl(url)) return false;
  const platform = options.platform ?? process.platform;
  return launchBrowser(launchCommand(platform, url), options.spawn ?? spawnDetached);
}
