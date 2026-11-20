#!/usr/bin/env node
// Decides whether CI should publish goals-cli: true only when the local package version is
// strictly newer than the version currently on npm. Pure functions are exported for reuse;
// main() runs only when this file is executed directly (reads LOCAL_PACKAGE, NPM_VERSION,
// GITHUB_OUTPUT).
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

function parse(version) {
  const match = typeof version === 'string' ? SEMVER.exec(version) : null;
  if (!match) throw new Error(`Invalid semver: "${String(version)}"`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] === undefined ? [] : match[4].split('.'),
  };
}

const compareNumbers = (a, b) => Math.sign(a - b);
const compareStrings = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const isNumeric = (id) => /^\d+$/.test(id);

/** Numeric identifiers rank below alphanumeric ones (semver §11). */
const rank = (id) => (isNumeric(id) ? 0 : 1);

function comparePrereleaseId(a, b) {
  const byRank = compareNumbers(rank(a), rank(b));
  if (byRank !== 0) return byRank;
  return isNumeric(a) ? compareNumbers(Number(a), Number(b)) : compareStrings(a, b);
}

/** Compares the dot-separated prerelease lists pairwise, then by identifier count. */
function comparePrereleaseIds(left, right) {
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i++) {
    const result = comparePrereleaseId(left[i], right[i]);
    if (result !== 0) return result;
  }
  return 0;
}

function comparePrerelease(left, right) {
  // A version without prerelease identifiers outranks the same core with them.
  if (left.length === 0 || right.length === 0) return Math.sign(right.length - left.length);
  const shared = comparePrereleaseIds(left, right);
  return shared !== 0 ? shared : Math.sign(left.length - right.length);
}

function compareCore(left, right) {
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/** @returns {-1 | 0 | 1} */
export function compareSemver(a, b) {
  const left = parse(a);
  const right = parse(b);
  const core = compareCore(left.core, right.core);
  return core !== 0 ? core : comparePrerelease(left.pre, right.pre);
}

export function shouldPublish(local, npm) {
  return compareSemver(local, npm) > 0;
}

function readInputs() {
  const packagePath = process.env.LOCAL_PACKAGE;
  const npmVersion = process.env.NPM_VERSION?.trim();
  if (!packagePath || !npmVersion) {
    throw new Error('LOCAL_PACKAGE and NPM_VERSION must both be set');
  }
  const local = JSON.parse(readFileSync(packagePath, 'utf8')).version;
  return { local, npmVersion };
}

function announce(publish, local, npm) {
  return publish
    ? `goals-cli ${local} is newer than npm ${npm}; publishing`
    : `goals-cli ${local} is not newer than npm ${npm}; nothing to publish`;
}

function main() {
  const { local, npmVersion } = readInputs();
  const publish = shouldPublish(local, npmVersion); // throws on invalid input -> non-zero exit
  const lines = `should_publish=${publish}\nversion=${local}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
  else process.stdout.write(lines); // local runs: show what CI would record
  console.log(announce(publish, local, npmVersion));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`version-gate: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
