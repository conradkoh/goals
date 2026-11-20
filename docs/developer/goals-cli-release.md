# goals-cli release

The `goals-cli` package (binary `goals`) lives in `packages/cli`.
`.github/workflows/deploy-prod.yml` (workflow name **Production Deployment**) is the single master
pipeline. It deploys the Convex backend and publishes `goals-cli` to npm on merge to `master` when
the package version is newer than the one on npm. It uses GitHub OIDC trusted publishing, so there
is no npm token anywhere.

## Normal release

1. Bump `version` in `packages/cli/package.json` and add a `CHANGELOG.md` entry.
2. Merge to `master`.
3. Watch the **Production Deployment** workflow in GitHub Actions.

Outcomes:

- Version newer than npm's → the `publish` job runs and publishes the packed tarball.
- Version equal to or older than npm's → green run, `publish` skipped, the log says the version
  is "not newer than npm". Re-running a run can therefore never double-publish.

A CLI-only merge also runs the `deploy_backend` job, so it redeploys the Convex backend. That is
idempotent and an accepted trade-off.

`goals --version` reports the published version; it is read from the package version.

## Order of operations for this programme

Backend deploys first: `deploy-prod.yml` deploys the backend on master pushes that touch its path
filter, including `services/backend/**`. The CLI's production login defaults point at that
deployment, so merge/deploy the backend before the first publish.

## One-time first publish (manual)

Trusted publishing can only be configured for a package that already exists, so publish the first
version by hand from a clean checkout of `master` with the maintainer's 2FA:

```bash
git switch master && git pull --ff-only && git status   # must be clean
pnpm install
pnpm --filter goals-cli build
cd packages/cli
npm login
npm pack
npm publish goals-cli-0.1.0.tgz --access public
```

Use the version in `package.json` for the tarball name, and remove the tarball afterwards
(`rm goals-cli-0.1.0.tgz`).

## Configure trusted publishing (within 2 days of the first publish)

npm discards an unused trust relationship after 2 days, so configure it right after the first
publish. The trusted workflow filename is **`deploy-prod.yml`**:

```bash
npm trust github goals-cli --file deploy-prod.yml --repo conradkoh/goals --allow-publish
```

(npm ≥ 11.15 and 2FA.) Or in npmjs.com → the package → **Settings** → **Trusted Publisher** →
GitHub Actions: owner `conradkoh`, repository `goals`, workflow filename `deploy-prod.yml`, no
environment.

### Re-register after the workflow rename

Earlier setups may have trusted a workflow file other than `deploy-prod.yml`, such as the retired
publish workflow. That workflow no longer exists. Before the next version bump, make sure the
package trusts `deploy-prod.yml`: run the command above, or
change the workflow filename in npmjs.com → the package → **Settings** → **Trusted Publisher**.
Then confirm the `publish` job of the next **Production Deployment** run passes.

## Rules

- Never add an `NPM_TOKEN` or any npm secret. Bypass-2FA tokens stop being able to publish around
  January 2027, and trusted publishing needs none.
- Never rename `deploy-prod.yml`. The filename is part of the npm trust config and the `publish`
  job lives in it; renaming it breaks publishing until trust is reconfigured.
- A CLI-only merge also runs the Convex deploy (`deploy_backend`), because `packages/cli/**` is in
  the workflow's path filter. This is idempotent and accepted.
- Provenance is attached automatically for a public repo and a public package; do not add
  `--provenance`.
- Versions across the workspace packages are intentionally unaligned. Only
  `packages/cli/package.json` matters for this release.

## Troubleshooting

- `check_version` fails with a registry error that is not "package not found" → rerun it. The
  step is deliberately fail-closed.
- `publish` fails with a 404/403 "trusted publisher" error → the trust config is missing or
  expired, names any workflow file other than `deploy-prod.yml`, or the repository does not
  match. Redo
  [Configure trusted publishing](#configure-trusted-publishing-within-2-days-of-the-first-publish)
  with `deploy-prod.yml`.
- The publish job fails the npm-version check → the runner image's Node 24 ships npm < 11.5.1.
  Bump the `setup-node` step or add an npm upgrade step.
