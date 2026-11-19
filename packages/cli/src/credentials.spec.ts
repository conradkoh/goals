import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createEmptyCredentials,
  effectiveDefaultLabel,
  getCredentialsPath,
  identityKey,
  normalizeEnvironment,
  readCredentials,
  removeCredential,
  selectCredential,
  setDefaultLabel,
  upsertCredential,
  validateCredentials,
  writeCredentials,
} from './credentials.js';
import type { CredentialsFile, StoredCredential } from './credentials.js';
import { CliError, UsageError } from './errors.js';

const TOKEN = 'super-secret-token-value';
const modeIt = process.platform === 'win32' ? it.skip : it;

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'goals-cli-credentials-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function credential(overrides: Partial<StoredCredential> = {}): StoredCredential {
  return {
    label: 'work',
    userId: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    environment: 'work',
    webappUrl: 'https://goals.example.com',
    convexUrl: 'https://example-123.convex.site',
    credentialId: 'cred-1',
    token: TOKEN,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function credentialsFile(overrides: Partial<CredentialsFile> = {}): CredentialsFile {
  return {
    schemaVersion: 1,
    installationId: 'installation-1',
    accounts: [credential()],
    ...overrides,
  };
}

describe('getCredentialsPath', () => {
  it('prefers an explicit file path', () => {
    expect(getCredentialsPath({ filePath: '/tmp/explicit.json', platform: 'darwin' })).toBe(
      '/tmp/explicit.json'
    );
  });

  it('uses Application Support on darwin', () => {
    expect(getCredentialsPath({ platform: 'darwin', homeDir: '/Users/me', env: {} })).toBe(
      '/Users/me/Library/Application Support/goals/credentials.json'
    );
  });

  it('uses XDG_CONFIG_HOME on linux when set', () => {
    expect(
      getCredentialsPath({
        platform: 'linux',
        homeDir: '/home/me',
        env: { XDG_CONFIG_HOME: '/xdg' },
      })
    ).toBe('/xdg/goals/credentials.json');
  });

  it('falls back to ~/.config on linux', () => {
    expect(getCredentialsPath({ platform: 'linux', homeDir: '/home/me', env: {} })).toBe(
      '/home/me/.config/goals/credentials.json'
    );
  });

  it('uses APPDATA on win32', () => {
    expect(
      getCredentialsPath({
        platform: 'win32',
        homeDir: 'C:\\Users\\me',
        env: { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' },
      })
    ).toBe('C:\\Users\\me\\AppData\\Roaming\\goals\\credentials.json');
  });

  it('falls back to the home directory on win32', () => {
    expect(getCredentialsPath({ platform: 'win32', homeDir: 'C:\\Users\\me', env: {} })).toBe(
      'C:\\Users\\me\\AppData\\Roaming\\goals\\credentials.json'
    );
  });
});

describe('createEmptyCredentials', () => {
  it('creates an empty schemaVersion 1 file with a fresh installation id', () => {
    expect(createEmptyCredentials(() => 'generated-id')).toEqual({
      schemaVersion: 1,
      installationId: 'generated-id',
      accounts: [],
    });
  });
});

describe('normalizeEnvironment', () => {
  it('trims and lowercases', () => {
    expect(normalizeEnvironment('  Work  ')).toBe('work');
  });

  it('returns undefined for an empty value', () => {
    expect(normalizeEnvironment(undefined)).toBeUndefined();
    expect(normalizeEnvironment('   ')).toBeUndefined();
  });

  it('rejects an invalid qualifier', () => {
    expect(() => normalizeEnvironment('bad qualifier')).toThrow(UsageError);
    expect(() => normalizeEnvironment('bad qualifier')).toThrow(/--env/);
  });
});

describe('readCredentials / writeCredentials', () => {
  it('round-trips through a real file', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'nested', 'credentials.json');
    const initial = credentialsFile();

    const written = await writeCredentials(initial, { filePath });
    const read = await readCredentials({ filePath });

    expect(written).toBe(filePath);
    expect(read.path).toBe(filePath);
    expect(read.credentials).toEqual(initial);
  });

  it('writes, reads and selects the stored credential', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');

    await writeCredentials(credentialsFile(), { filePath });
    const { credentials } = await readCredentials({ filePath });
    const selected = selectCredential(credentials, { env: {} });

    expect(selected.userId).toBe('user-1');
    expect(selected.token).toBe(TOKEN);
  });

  modeIt('writes a 0600 file in a 0700 directory', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'nested', 'credentials.json');

    await writeCredentials(credentialsFile(), { filePath });

    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, 'nested'))).mode & 0o777).toBe(0o700);
  });

  modeIt('tightens pre-existing loose permissions', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');
    await writeFile(filePath, JSON.stringify(credentialsFile()), { mode: 0o644 });
    await chmod(dir, 0o755);

    await writeCredentials(credentialsFile(), { filePath });
    expect((await stat(dir)).mode & 0o777).toBe(0o700);

    await chmod(filePath, 0o644);
    await readCredentials({ filePath });
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it('leaves no temporary file after a successful write', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');

    await writeCredentials(credentialsFile(), { filePath });

    const leftovers = (await readdir(dir)).filter((name) => name.startsWith('.credentials.'));
    expect(leftovers).toEqual([]);
  });

  it('does not remove a colliding temporary file created by another writer', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');
    await writeCredentials(credentialsFile(), { filePath });
    const before = await readFile(filePath, 'utf8');
    const collision = join(dir, '.credentials.collision.tmp');
    await writeFile(collision, 'unrelated');

    await expect(
      writeCredentials(credentialsFile({ installationId: 'other' }), {
        filePath,
        randomUUID: () => 'collision',
      })
    ).rejects.toThrow();

    expect(await readFile(collision, 'utf8')).toBe('unrelated');
    expect(await readFile(filePath, 'utf8')).toBe(before);
  });

  it('rejects when the target path is a directory and cleans up its temporary file', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');
    await mkdir(filePath);

    await expect(writeCredentials(credentialsFile(), { filePath })).rejects.toThrow();

    const leftovers = (await readdir(dir)).filter((name) => name.startsWith('.credentials.'));
    expect(leftovers).toEqual([]);
  });

  it('returns empty in-memory credentials for a missing file without creating it', async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');

    const read = await readCredentials({ filePath, randomUUID: () => 'fresh-installation' });

    expect(read.path).toBe(filePath);
    expect(read.credentials.installationId).toBe('fresh-installation');
    expect(read.credentials.accounts).toEqual([]);
    await expect(readFile(filePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('readCredentials validation', () => {
  const cases: [string, string][] = [
    ['malformed JSON', '{not json'],
    ['schemaVersion 2', JSON.stringify(credentialsFile({ schemaVersion: 2 as 1 }))],
    ['missing installationId', JSON.stringify({ ...credentialsFile(), installationId: '' })],
    [
      'account missing token',
      JSON.stringify({
        ...credentialsFile(),
        accounts: [{ ...credential(), token: undefined }],
      }),
    ],
    [
      'bad convexUrl',
      JSON.stringify(
        credentialsFile({ accounts: [credential({ convexUrl: 'http://example.com' })] })
      ),
    ],
    [
      'duplicate labels',
      JSON.stringify(
        credentialsFile({
          accounts: [credential(), credential({ userId: 'user-2', environment: 'personal' })],
        })
      ),
    ],
    [
      'duplicate identity',
      JSON.stringify(credentialsFile({ accounts: [credential(), credential({ label: 'other' })] })),
    ],
    ['defaultLabel not in accounts', JSON.stringify(credentialsFile({ defaultLabel: 'missing' }))],
    [
      'invalid expiresAt',
      JSON.stringify(credentialsFile({ accounts: [credential({ expiresAt: 'not-a-date' })] })),
    ],
  ];

  it.each(cases)('%s is rejected without touching the file', async (_name, contents) => {
    const dir = await makeTempDir();
    const filePath = join(dir, 'credentials.json');
    await writeFile(filePath, contents);

    const error = await readCredentials({ filePath }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(CliError);
    expect((error as Error).message).toContain('Invalid credentials file');
    expect(await readFile(filePath, 'utf8')).toBe(contents);
  });
});

describe('validateCredentials', () => {
  it('accepts a well-formed file', () => {
    expect(validateCredentials(credentialsFile())).toEqual(credentialsFile());
  });

  it('rejects a non-object', () => {
    expect(() => validateCredentials(null)).toThrow(CliError);
    expect(() => validateCredentials([])).toThrow(CliError);
  });
});

describe('upsertCredential', () => {
  it('appends a new identity and makes the first account the default', () => {
    const next = upsertCredential(credentialsFile({ accounts: [] }), credential());

    expect(next.accounts).toEqual([credential()]);
    expect(next.defaultLabel).toBe('work');
  });

  it('replaces the entry with the same identity and keeps the default', () => {
    const file = credentialsFile({
      accounts: [
        credential({ label: 'personal', environment: 'personal' }),
        credential({ label: 'work' }),
      ],
      defaultLabel: 'work',
    });

    const next = upsertCredential(
      file,
      credential({ token: 'rotated-token', name: 'Ada Lovelace' })
    );

    expect(next.accounts).toHaveLength(2);
    expect(next.accounts[0]).toEqual(credential({ label: 'personal', environment: 'personal' }));
    expect(next.accounts[1]).toEqual(credential({ token: 'rotated-token', name: 'Ada Lovelace' }));
    expect(next.defaultLabel).toBe('work');
  });

  it('treats a different convexUrl or environment as a separate identity', () => {
    const file = credentialsFile({ accounts: [] });
    const first = upsertCredential(file, credential());
    const second = upsertCredential(
      first,
      credential({ label: 'self-hosted', convexUrl: 'https://other.convex.site' })
    );
    const third = upsertCredential(
      second,
      credential({ label: 'personal', environment: 'personal' })
    );

    expect(third.accounts).toHaveLength(3);
    expect(third.defaultLabel).toBe('work');
  });

  it('rejects reusing a label for a different identity', () => {
    const file = credentialsFile();

    const error = (() => {
      try {
        upsertCredential(file, credential({ userId: 'user-2', environment: 'personal' }));
      } catch (thrown) {
        return thrown;
      }
      return undefined;
    })();

    expect(error).toBeInstanceOf(UsageError);
    expect((error as Error).message).toContain('--name');
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it('moves the default when the default entry is renamed by re-login', () => {
    const file = credentialsFile({ defaultLabel: 'work' });

    const next = upsertCredential(file, credential({ label: 'renamed' }));

    expect(next.accounts).toHaveLength(1);
    expect(next.defaultLabel).toBe('renamed');
  });

  it('leaves an unset default unset when replacing the sole account', () => {
    const file = credentialsFile();

    const next = upsertCredential(file, credential({ label: 'renamed' }));

    expect(next.accounts).toHaveLength(1);
    expect(next.defaultLabel).toBeUndefined();
    expect(effectiveDefaultLabel(next)).toBe('renamed');
  });
});

describe('identityKey', () => {
  it('combines convexUrl, environment and userId', () => {
    expect(identityKey(credential())).toBe('https://example-123.convex.site\nwork\nuser-1');
    expect(identityKey(credential({ environment: undefined }))).toBe(
      'https://example-123.convex.site\n\nuser-1'
    );
  });
});

describe('selectCredential', () => {
  const twoAccounts = credentialsFile({
    accounts: [
      credential({ label: 'work' }),
      credential({ label: 'personal', environment: 'personal' }),
    ],
  });

  it('prefers --as over GOALS_AS, the default and the sole account', () => {
    const file = { ...twoAccounts, defaultLabel: 'personal' };
    expect(selectCredential(file, { as: 'work', env: { GOALS_AS: 'personal' } }).label).toBe(
      'work'
    );
    expect(selectCredential(file, { env: { GOALS_AS: 'work' } }).label).toBe('work');
    expect(selectCredential(file, { env: {} }).label).toBe('personal');
    expect(selectCredential(credentialsFile(), { env: {} }).label).toBe('work');
  });

  it('rejects an unknown label', () => {
    expect(() => selectCredential(twoAccounts, { as: 'nope', env: {} })).toThrow(UsageError);
    expect(() => selectCredential(twoAccounts, { as: 'nope', env: {} })).toThrow(
      "no identity labelled 'nope'"
    );
  });

  it('requires a choice when multiple identities exist without a default', () => {
    expect(() => selectCredential(twoAccounts, { env: {} })).toThrow(UsageError);
    expect(() => selectCredential(twoAccounts, { env: {} })).toThrow(/--as/);
  });

  it('fails when nothing is stored', () => {
    expect(() => selectCredential(credentialsFile({ accounts: [] }), { env: {} })).toThrow(
      CliError
    );
    expect(() => selectCredential(credentialsFile({ accounts: [] }), { env: {} })).toThrow(
      /goals auth login/
    );
  });
});

describe('defaults and removal', () => {
  it('removes an entry and clears a matching default', () => {
    const next = removeCredential(credentialsFile({ defaultLabel: 'work' }), 'work');

    expect(next.accounts).toEqual([]);
    expect(next.defaultLabel).toBeUndefined();
  });

  it('keeps an unrelated default when removing another entry', () => {
    const file = credentialsFile({
      accounts: [
        credential({ label: 'work' }),
        credential({ label: 'personal', environment: 'personal' }),
      ],
      defaultLabel: 'work',
    });

    const next = removeCredential(file, 'personal');

    expect(next.accounts.map((account) => account.label)).toEqual(['work']);
    expect(next.defaultLabel).toBe('work');
  });

  it('rejects setting a default for an unknown label', () => {
    expect(() => setDefaultLabel(credentialsFile(), 'nope')).toThrow(UsageError);
    expect(() => setDefaultLabel(credentialsFile(), 'nope')).toThrow("no identity labelled 'nope'");
  });

  it('falls back to the sole account as the effective default', () => {
    expect(effectiveDefaultLabel(credentialsFile())).toBe('work');
    expect(effectiveDefaultLabel(credentialsFile({ defaultLabel: 'work' }))).toBe('work');
    expect(
      effectiveDefaultLabel(
        credentialsFile({
          accounts: [
            credential({ label: 'work' }),
            credential({ label: 'personal', environment: 'personal' }),
          ],
        })
      )
    ).toBeUndefined();
  });
});
