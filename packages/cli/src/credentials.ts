import { randomUUID as uuid } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, posix, win32 } from 'node:path';

import { parseOrigin } from './endpoints.js';
import { CliError, UsageError } from './errors.js';

export interface StoredCredential {
  label: string; // unique in the file; default at login = environment ?? 'default'
  userId: string;
  name: string;
  email?: string;
  environment?: string;
  webappUrl: string;
  convexUrl: string;
  credentialId: string; // server tokenId, safe to display
  token: string; // SECRET: never printed or logged
  createdAt: string; // ISO
  expiresAt: string; // ISO
}

export interface CredentialsFile {
  schemaVersion: 1;
  installationId: string;
  defaultLabel?: string;
  accounts: StoredCredential[];
}

export interface CredentialStoreOptions {
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  /** Full path override (tests). */
  filePath?: string;
  randomUUID?: () => string;
}

export const LABEL_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const ENVIRONMENT_PATTERN = /^[a-z0-9._-]{1,64}$/;

/** Trims/lowercases `--env`; undefined for empty; UsageError for an invalid qualifier. */
export function normalizeEnvironment(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  const normalized = input.trim().toLowerCase();
  if (normalized === '') return undefined;
  if (!ENVIRONMENT_PATTERN.test(normalized)) {
    throw new UsageError(
      "--env must contain only lowercase letters, digits, '.', '_' or '-' (max 64 characters)"
    );
  }
  return normalized;
}

function homeDirectory(options: CredentialStoreOptions, env: NodeJS.ProcessEnv): string {
  return options.homeDir ?? env.HOME ?? homedir();
}

function windowsHome(options: CredentialStoreOptions, env: NodeJS.ProcessEnv): string {
  return options.homeDir ?? env.USERPROFILE ?? homeDirectory(options, env);
}

function windowsCredentialsPath(options: CredentialStoreOptions, env: NodeJS.ProcessEnv): string {
  const appData = env.APPDATA ?? win32.join(windowsHome(options, env), 'AppData', 'Roaming');
  return win32.join(appData, 'goals', 'credentials.json');
}

function darwinCredentialsPath(options: CredentialStoreOptions, env: NodeJS.ProcessEnv): string {
  return posix.join(
    homeDirectory(options, env),
    'Library',
    'Application Support',
    'goals',
    'credentials.json'
  );
}

function configDirectory(options: CredentialStoreOptions, env: NodeJS.ProcessEnv): string {
  const configured = env.XDG_CONFIG_HOME;
  if (configured !== undefined && configured !== '') return configured;
  return posix.join(homeDirectory(options, env), '.config');
}

function resolvePlatform(options: CredentialStoreOptions): NodeJS.Platform {
  return options.platform ?? process.platform;
}

function resolveEnv(options: CredentialStoreOptions): NodeJS.ProcessEnv {
  return options.env ?? process.env;
}

// Read/written only through readCredentials/writeCredentials; asserted by credentials.spec.ts.
// fallow-ignore-next-line unused-export
export function getCredentialsPath(options: CredentialStoreOptions = {}): string {
  if (options.filePath !== undefined) return options.filePath;
  const platform = resolvePlatform(options);
  const env = resolveEnv(options);
  if (platform === 'win32') return windowsCredentialsPath(options, env);
  if (platform === 'darwin') return darwinCredentialsPath(options, env);
  return posix.join(configDirectory(options, env), 'goals', 'credentials.json');
}

// Read through readCredentials; asserted by credentials.spec.ts.
// fallow-ignore-next-line unused-export
export function createEmptyCredentials(randomUUID: () => string = uuid): CredentialsFile {
  return { schemaVersion: 1, installationId: randomUUID(), accounts: [] };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDate(value: unknown): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isOrigin(value: unknown): boolean {
  return typeof value === 'string' && parseOrigin(value) === value;
}

function isLabel(value: unknown): boolean {
  return typeof value === 'string' && LABEL_PATTERN.test(value);
}

function isOptionalEmail(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalEnvironment(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && ENVIRONMENT_PATTERN.test(value));
}

const REQUIRED_STRING_FIELDS = ['label', 'userId', 'name', 'credentialId', 'token'] as const;
const ORIGIN_FIELDS = ['webappUrl', 'convexUrl'] as const;
const DATE_FIELDS = ['createdAt', 'expiresAt'] as const;

const ACCOUNT_RULES: ((account: Record<string, unknown>) => boolean)[] = [
  (account) => isLabel(account.label),
  (account) => REQUIRED_STRING_FIELDS.every((field) => isNonEmptyString(account[field])),
  (account) => ORIGIN_FIELDS.every((field) => isOrigin(account[field])),
  (account) => DATE_FIELDS.every((field) => isValidDate(account[field])),
  (account) => isOptionalEmail(account.email),
  (account) => isOptionalEnvironment(account.environment),
];

function isAccount(value: unknown): value is StoredCredential {
  if (typeof value !== 'object' || value === null) return false;
  const account = value as Record<string, unknown>;
  return ACCOUNT_RULES.every((rule) => rule(account));
}

function hasHeader(file: Record<string, unknown>): boolean {
  return (
    file.schemaVersion === 1 &&
    isNonEmptyString(file.installationId) &&
    Array.isArray(file.accounts)
  );
}

function isAccountList(file: Record<string, unknown>): boolean {
  return Array.isArray(file.accounts) && file.accounts.every(isAccount);
}

function isCredentialsFile(value: unknown): value is CredentialsFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  return hasHeader(file) && isAccountList(file);
}

function failInvalid(): never {
  throw new CliError('Invalid credentials file');
}

function hasUniqueKeys<T>(values: T[], keyOf: (value: T) => string): boolean {
  return new Set(values.map(keyOf)).size === values.length;
}

function isDefaultLabelValid(file: CredentialsFile): boolean {
  if (file.defaultLabel === undefined) return true;
  return file.accounts.some((account) => account.label === file.defaultLabel);
}

function hasUniqueLabelsAndIdentities(accounts: StoredCredential[]): boolean {
  return (
    hasUniqueKeys(accounts, (account) => account.label) && hasUniqueKeys(accounts, identityKey)
  );
}

// Applied by readCredentials/writeCredentials; asserted by credentials.spec.ts.
// fallow-ignore-next-line unused-export
export function validateCredentials(value: unknown): CredentialsFile {
  if (!isCredentialsFile(value)) failInvalid();
  if (!hasUniqueLabelsAndIdentities(value.accounts)) failInvalid();
  if (!isDefaultLabelValid(value)) failInvalid();
  return value;
}

export function identityKey(credential: StoredCredential): string {
  return `${credential.convexUrl}\n${credential.environment ?? ''}\n${credential.userId}`;
}

function labelOwnerIndex(
  file: CredentialsFile,
  credential: StoredCredential,
  existingIndex: number
): number {
  return file.accounts.findIndex(
    (account, index) => index !== existingIndex && account.label === credential.label
  );
}

function withReplacedAccount(
  file: CredentialsFile,
  credential: StoredCredential,
  existingIndex: number
): StoredCredential[] {
  if (existingIndex === -1) return [...file.accounts, credential];
  return file.accounts.map((account, index) => (index === existingIndex ? credential : account));
}

function isFirstAccount(file: CredentialsFile): boolean {
  return file.accounts.length === 0 && file.defaultLabel === undefined;
}

function isRenamedDefault(replaced: StoredCredential | undefined, file: CredentialsFile): boolean {
  return replaced !== undefined && file.defaultLabel === replaced.label;
}

function nextDefaultLabel(
  file: CredentialsFile,
  credential: StoredCredential,
  replaced: StoredCredential | undefined
): string | undefined {
  if (isFirstAccount(file)) return credential.label;
  if (isRenamedDefault(replaced, file)) return credential.label;
  return file.defaultLabel;
}

export function upsertCredential(
  file: CredentialsFile,
  credential: StoredCredential
): CredentialsFile {
  const key = identityKey(credential);
  const existingIndex = file.accounts.findIndex((account) => identityKey(account) === key);
  if (labelOwnerIndex(file, credential, existingIndex) !== -1) {
    throw new UsageError(
      `identity label '${credential.label}' is already used by another account; pass --name ${credential.label} to choose a different one`
    );
  }
  const replaced = existingIndex === -1 ? undefined : file.accounts[existingIndex];
  const accounts = withReplacedAccount(file, credential, existingIndex);
  return {
    ...file,
    accounts,
    defaultLabel: nextDefaultLabel(file, credential, replaced),
  };
}

export function removeCredential(file: CredentialsFile, label: string): CredentialsFile {
  const accounts = file.accounts.filter((account) => account.label !== label);
  const defaultLabel = file.defaultLabel === label ? undefined : file.defaultLabel;
  return { ...file, accounts, defaultLabel };
}

export function setDefaultLabel(file: CredentialsFile, label: string): CredentialsFile {
  if (!file.accounts.some((account) => account.label === label)) {
    throw new UsageError(
      `no identity labelled '${label}'; run \`goals auth list\` to see the stored identities`
    );
  }
  return { ...file, defaultLabel: label };
}

export function effectiveDefaultLabel(file: CredentialsFile): string | undefined {
  if (file.defaultLabel !== undefined) return file.defaultLabel;
  return file.accounts.length === 1 ? file.accounts[0]?.label : undefined;
}

function findAccount(file: CredentialsFile, label: string): StoredCredential {
  const account = file.accounts.find((candidate) => candidate.label === label);
  if (account === undefined) {
    throw new UsageError(
      `no identity labelled '${label}'; run \`goals auth list\` to see the stored identities`
    );
  }
  return account;
}

function requestedLabel(options: { as?: string; env: NodeJS.ProcessEnv }): string | undefined {
  const fromFlag = options.as?.trim();
  if (fromFlag !== undefined && fromFlag !== '') return fromFlag;
  const fromEnv = options.env.GOALS_AS?.trim();
  return fromEnv === '' ? undefined : fromEnv;
}

export function selectCredential(
  file: CredentialsFile,
  options: { as?: string; env: NodeJS.ProcessEnv }
): StoredCredential {
  if (file.accounts.length === 0) {
    throw new CliError('Not logged in; run `goals auth login`.');
  }
  const requested = requestedLabel(options);
  if (requested !== undefined) return findAccount(file, requested);
  const defaultLabel = effectiveDefaultLabel(file);
  if (defaultLabel !== undefined) return findAccount(file, defaultLabel);
  throw new UsageError(
    'multiple identities are stored and none is the default; pass --as <label> or run `goals auth use <label>`'
  );
}

function parseCredentialsFile(raw: string, path: string): CredentialsFile {
  try {
    return validateCredentials(JSON.parse(raw));
  } catch {
    throw new CliError(`Invalid credentials file: ${path}`);
  }
}

export async function readCredentials(
  options: CredentialStoreOptions = {}
): Promise<{ path: string; credentials: CredentialsFile }> {
  const path = getCredentialsPath(options);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { path, credentials: createEmptyCredentials(options.randomUUID) };
    }
    throw new CliError(`Unable to read credentials file: ${path}`);
  }
  const credentials = parseCredentialsFile(raw, path);
  await chmod(dirname(path), 0o700).catch(() => {});
  await chmod(path, 0o600).catch(() => {});
  return { path, credentials };
}

export async function writeCredentials(
  credentials: CredentialsFile,
  options: CredentialStoreOptions = {}
): Promise<string> {
  validateCredentials(credentials);
  const path = getCredentialsPath(options);
  const dir = dirname(path);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700).catch(() => {});
  const tmp = join(dir, `.credentials.${(options.randomUUID ?? uuid)()}.tmp`);
  let created = false;
  try {
    const handle = await open(tmp, 'wx', 0o600);
    created = true;
    try {
      await handle.writeFile(`${JSON.stringify(credentials, null, 2)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await chmod(tmp, 0o600).catch(() => {});
    await rename(tmp, path);
    return path;
  } catch (error) {
    if (created) await unlink(tmp).catch(() => {});
    throw error;
  }
}
