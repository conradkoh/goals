import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Guards the production workflow against regressions that would break npm trusted publishing,
 * widen the publish gate, or change the Convex deploy. The workflow is inspected as text: this
 * catches forbidden tokens, permissions, job wiring and path filters, but says nothing about
 * GitHub's semantic evaluation of the workflow (that needs a real run).
 */

const WORKFLOW = readFileSync(
  fileURLToPath(new URL('../../../.github/workflows/deploy-prod.yml', import.meta.url)),
  'utf8'
);

const RETIRED_WORKFLOW_PATH = fileURLToPath(
  new URL('../../../.github/workflows/publish-goals-cli.yml', import.meta.url)
);

const PUSH_PATHS = [
  '.github/workflows/deploy-prod.yml',
  'services/backend/**',
  'packages/cli/**',
  'packages/shared/src/utilities/quarterly-markdown/**',
  'packages/shared/src/utilities/cli-contract/**',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
];

const JOB_IDS = ['deploy_backend', 'verify', 'check_version', 'publish'];

/** The text of one job: from its `  <id>:` line up to the next job key, or end of file. */
function jobBlock(id: string): string {
  const lines = WORKFLOW.split('\n');
  const start = lines.indexOf(`  ${id}:`);
  if (start === -1) throw new Error(`job "${id}" is missing from deploy-prod.yml`);
  const next = lines.findIndex((line, index) => index > start && /^  [a-z_]+:$/.test(line));
  return lines.slice(start, next === -1 ? lines.length : next).join('\n');
}

describe('deploy-prod workflow', () => {
  it('no longer ships the standalone CLI publish workflow', () => {
    expect(existsSync(RETIRED_WORKFLOW_PATH)).toBe(false);
  });

  it('is named for production and keeps manual dispatch', () => {
    expect(WORKFLOW).toMatch(/^name: Production Deployment$/m);
    expect(WORKFLOW).toMatch(/^  workflow_dispatch:$/m);
  });

  it('runs on master pushes that touch the backend or the CLI release inputs', () => {
    expect(WORKFLOW).toMatch(/^    branches: \[master\]$/m);
    for (const filter of PUSH_PATHS) expect(WORKFLOW).toContain(`- '${filter}'`);
  });

  it('declares exactly the four jobs', () => {
    const jobs = WORKFLOW.slice(WORKFLOW.indexOf('\njobs:\n'));
    const ids = [...jobs.matchAll(/^  ([a-z_]+):$/gm)].map((match) => match[1]);
    expect(ids).toEqual(JOB_IDS);
  });

  it('reads the token as read-only by default and grants id-token only to publish', () => {
    expect(WORKFLOW).toMatch(/^permissions:\n  contents: read$/m);
    expect(WORKFLOW.match(/id-token: write/g)).toHaveLength(1);
    expect(jobBlock('publish')).toContain('id-token: write');
    for (const id of ['deploy_backend', 'verify', 'check_version']) {
      expect(jobBlock(id)).not.toContain('id-token');
    }
  });

  it('serializes runs without cancelling an in-flight deploy or publish', () => {
    expect(WORKFLOW).toMatch(/^concurrency:\n  group: deploy-prod\n  cancel-in-progress: false$/m);
  });

  it('keeps the Convex deploy and migrations, master-only and independent of the CLI jobs', () => {
    const deploy = jobBlock('deploy_backend');
    expect(deploy).toContain("if: github.ref == 'refs/heads/master'");
    expect(deploy).toContain('run: pnpm --filter @workspace/backend run deploy');
    expect(deploy).toContain('run: pnpm --filter @workspace/backend run migrate');
    expect(deploy).toContain('CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_PROD }}');
    expect(deploy).not.toMatch(/^    needs:/m);
  });

  it('runs the CLI and shared-utility checks in the verify job', () => {
    const verify = jobBlock('verify');
    expect(verify).toContain('run: pnpm --filter goals-cli test');
    expect(verify).toContain('run: pnpm --filter goals-cli typecheck');
    expect(verify).toContain('run: pnpm --filter goals-cli build');
    expect(verify).toContain('run: pnpm --filter @workspace/shared test');
  });

  it('gates publishing on a version strictly newer than npm, reading npm both ways', () => {
    const gate = jobBlock('check_version');
    expect(gate).toContain('npm view goals-cli version --registry="$registry"');
    expect(gate).toContain('npm view "goals-cli@$lookup_version" version --registry="$registry"');
    expect(gate).toContain('npm_version="$local_version"');
    expect(gate).toContain('node packages/cli/scripts/version-gate.mjs');
    // a non-404 registry error must still fail the job (once per npm view command)
    expect(gate.match(/npm view failed for a reason other than/g)).toHaveLength(2);
  });

  it('publishes only on master, after verify and the version gate', () => {
    const publish = jobBlock('publish');
    expect(publish).toContain('needs: [verify, check_version]');
    expect(publish).toContain(
      "if: needs.check_version.outputs.should_publish == 'true' && github.ref == 'refs/heads/master'"
    );
  });

  it('tags prereleases next and never publishes a prerelease as latest', () => {
    const publish = jobBlock('publish');
    expect(publish).toContain('core="${VERSION%%+*}"');
    expect(publish).toContain('if [[ "$core" == *-* ]]; then tag=next; else tag=latest; fi');
    expect(publish).toContain(
      'npm publish "$TARBALL" --access public --ignore-scripts --tag "$tag"'
    );
  });

  it('authenticates only through GitHub OIDC: no npm token, registry-url or provenance flag', () => {
    expect(WORKFLOW).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
    expect(WORKFLOW).not.toMatch(/secrets\.(?!CONVEX_DEPLOY_KEY_PROD\b)/);
    expect(WORKFLOW).not.toMatch(/registry-url/);
    expect(WORKFLOW).not.toMatch(/--provenance/);
  });
});
