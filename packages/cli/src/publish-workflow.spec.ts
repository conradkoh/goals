import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Guards the release pipeline against regressions that would break npm trusted publishing or
 * couple a CLI release to the Convex deploy. The workflow file is inspected as text: this catches
 * forbidden tokens, permissions and path filters, but says nothing about GitHub's semantic
 * evaluation of the workflow (that needs a real run).
 */

const WORKFLOW = readFileSync(
  fileURLToPath(new URL('../../../.github/workflows/publish-goals-cli.yml', import.meta.url)),
  'utf8'
);

const DEPLOY_WORKFLOW = readFileSync(
  fileURLToPath(new URL('../../../.github/workflows/deploy-prod.yml', import.meta.url)),
  'utf8'
);

const PUBLISH_JOB = /^  publish:$/m;

const PATH_FILTERS = [
  "'packages/cli/**'",
  "'packages/shared/src/utilities/quarterly-markdown/**'",
  "'packages/shared/src/utilities/cli-contract/**'",
  "'pnpm-lock.yaml'",
  "'.github/workflows/publish-goals-cli.yml'",
];

describe('publish-goals-cli workflow', () => {
  it('does not authenticate with a token or force provenance', () => {
    expect(WORKFLOW).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);
    // `registry-url` makes setup-node write an .npmrc with a token placeholder that breaks OIDC.
    expect(WORKFLOW).not.toMatch(/registry-url/);
    expect(WORKFLOW).not.toMatch(/--provenance/);
  });

  it('grants id-token: write only to the publish job', () => {
    expect(WORKFLOW.match(/id-token: write/g)).toHaveLength(1);

    const beforePublish = WORKFLOW.slice(0, WORKFLOW.search(PUBLISH_JOB));
    expect(beforePublish).not.toContain('id-token');
  });

  it('publishes from master pushes and manual dispatches only', () => {
    expect(WORKFLOW).toContain('name: Publish goals-cli');
    expect(WORKFLOW).toContain('branches: [master]');
    expect(WORKFLOW).toContain('workflow_dispatch');
    expect(WORKFLOW).toContain('cancel-in-progress: false');
  });

  it('runs the publish job only when the gate says the version is newer', () => {
    expect(WORKFLOW).toContain(
      "if: needs.check_version.outputs.should_publish == 'true' && github.ref == 'refs/heads/master'"
    );
    expect(WORKFLOW).toContain('needs: [verify, check_version]');
    expect(WORKFLOW).toContain(
      'npm publish "$TARBALL" --access public --ignore-scripts --tag "$tag"'
    );
  });

  it('publishes prereleases under the next dist-tag, never latest', () => {
    expect(WORKFLOW).toContain('if [[ "$VERSION" == *-* ]]; then tag=next; else tag=latest; fi');
    expect(WORKFLOW).not.toMatch(/npm publish[^\n]*--tag latest/);
  });

  it('keeps the master-only guard inside the publish job', () => {
    const publishJob = WORKFLOW.slice(WORKFLOW.search(PUBLISH_JOB));
    expect(publishJob).toContain(
      "if: needs.check_version.outputs.should_publish == 'true' && github.ref == 'refs/heads/master'"
    );
  });

  it('rebuilds when the CLI or its vendored shared sources change', () => {
    for (const filter of PATH_FILTERS) expect(WORKFLOW).toContain(filter);
  });

  it('declares the verify, check_version and publish jobs exactly once', () => {
    for (const job of ['verify', 'check_version', 'publish']) {
      expect(WORKFLOW.match(new RegExp(`^  ${job}:$`, 'gm'))).toHaveLength(1);
    }
  });

  it('leaves the Convex production deploy untouched', () => {
    expect(DEPLOY_WORKFLOW).toContain("'services/backend/**'");
    expect(DEPLOY_WORKFLOW).not.toContain('packages/cli');
  });
});
