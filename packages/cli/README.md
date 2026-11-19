# goals-cli

Command-line access to your [Goals](https://goals-ten.vercel.app) app data. Read and manage
quarterly, weekly, daily and adhoc goals, list initiatives, and export the same markdown
summary the webapp produces.

## Requirements

Node.js 20 or newer.

## Install

Install the CLI globally:

```bash
npm i -g goals-cli
```

Or run it without installing:

```bash
npx goals-cli --version
```

## Log in

```bash
goals auth login
```

The CLI opens a browser approval page and prints a verification code on stderr. Open the
URL, type the code, and approve. The credential is stored locally and sent only to the Goals
API. No flags are needed for the production app; `--webapp-url` together with `--convex-url`
overrides both endpoints for a local or self-hosted deployment.

```bash
goals auth status
```

You can review and revoke CLI credentials at any time in the webapp profile page's **CLI
Access** section.

## Commands

| Command                        | What it does                                                   |
| ------------------------------ | -------------------------------------------------------------- |
| `goals auth login`             | Log in through the browser and store a credential.             |
| `goals auth logout`            | Revoke a credential and remove it from this machine.           |
| `goals auth status`            | Show the current identity and whether its credential is valid. |
| `goals auth list`              | List stored identities.                                        |
| `goals auth use <label>`       | Set the default identity.                                      |
| `goals goal list`              | List goals in one scope for a year.                            |
| `goals goal get <id>`          | Show one goal with its parent, children and details.           |
| `goals goal create`            | Create a quarterly, weekly, daily or adhoc goal.               |
| `goals goal rename <id>`       | Rename one goal.                                               |
| `goals goal complete <id>`     | Mark a goal complete.                                          |
| `goals goal reopen <id>`       | Mark a goal incomplete again.                                  |
| `goals goal delete <id> --yes` | Delete a goal and all of its child goals.                      |
| `goals initiative list`        | List initiatives.                                              |
| `goals initiative get <id>`    | Show one initiative and the goals tagged with it.              |
| `goals export markdown`        | Print the markdown summary for a quarter or a year.            |
| `goals skill activate`         | Print the agent skill and full command reference.              |

Run `goals <command> --help` or `goals <command> <action> --help` for every flag and example.
Add `--json` to a read command for machine-readable output, and `--as <label>` to choose an
identity for one invocation.

## For agents

`goals skill activate` prints a versioned skill stub followed by the full reference. It needs
no login, makes no network call and writes no files. Install the stub as a `goals-cli` skill
so your agent can find it again.

## Exit codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success.                                       |
| `1`  | Runtime, backend or authentication failure.    |
| `2`  | Usage error; the message starts with `Usage:`. |

stdout carries data. Progress and diagnostics go to stderr, so redirecting stdout is safe.

## Credential file

The credential file is created with mode `0600` inside a `0700` directory:

- macOS: `~/Library/Application Support/goals/credentials.json`
- Linux: `$XDG_CONFIG_HOME/goals/credentials.json`, or `~/.config/goals/credentials.json`
- Windows: `%APPDATA%\goals\credentials.json`

The token is never printed. Use `goals auth logout` to revoke it, or revoke it in the webapp
profile page's CLI Access section.

## Releasing

1. Bump `version` in `packages/cli/package.json`.
2. Merge to `master`. CI publishes only if the version is newer than the one on npm.
3. Watch the workflow run in GitHub Actions.

### One-time setup

Publish the first version manually:

```bash
cd packages/cli
npm login
npm publish --access public
```

`prepack` builds `dist/` before publishing. After the first release, add an npm Trusted
Publisher so later releases publish from CI: npmjs.com → the package's **Settings** →
**Trusted Publisher** → GitHub Actions, with owner `conradkoh`, repository `goals`, and the
workflow filename of the publish workflow (set when that workflow lands).
