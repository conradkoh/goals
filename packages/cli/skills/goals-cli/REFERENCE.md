# Goals CLI reference

The `goals` command-line tool reads and changes the Goals app data of the account you
authorize: quarterly, weekly, daily and adhoc goals, initiatives, and the same markdown
summary the webapp exports. This reference is versioned with the CLI, so it always describes
the installed commands.

## Install and log in

Install the CLI globally with `npm i -g goals-cli`, or run it without installing through
`npx goals-cli ...`. The CLI needs Node.js 20 or newer. Check what is installed with
`goals --version`.

`goals auth login` starts a browser approval: the CLI prints an approval URL and a
verification code on stderr and waits while you open the URL and type the code in the
browser. No flags are needed for the production app. Pass `--webapp-url` together with
`--convex-url` only for a local or self-hosted deployment.

```bash
goals --version
goals auth login
goals auth login --name dev --env dev --webapp-url http://localhost:3000 --convex-url http://127.0.0.1:3211
goals auth status
```

If a command exits 1 with a `Not logged in` message, ask the user to run `goals auth login`
themselves: the approval needs a human in a browser. Do not try to log in on their behalf.

## Identities

One machine can hold several credentials. Each login is stored under an identity label:
`--name <label>` picks the label, otherwise the environment qualifier (`--env`) is used, and
otherwise `default`. `goals auth list` shows every stored identity and marks the default with
`*`; `goals auth use <label>` changes the default; `goals auth logout` revokes the credential
and removes it from this machine.

Every data command accepts `--as <label>` to choose an identity for that one invocation. The
`GOALS_AS` environment variable does the same when the flag is absent. Selection order is:
`--as`, then `GOALS_AS`, then the default identity, then the only stored identity.

```bash
goals auth login --name dev --env dev
goals auth list
goals auth use dev
goals auth status --as dev --json
goals auth logout --as dev
```

## Conventions

Exit codes: `0` success, `1` runtime, backend or authentication failure, `2` usage error.
Usage errors start with `Usage:` on stderr. stdout carries data only; progress and
diagnostics go to stderr, so `goals ... > file.md` is safe.

List before you use an ID. Goal, initiative and domain IDs come from `goals goal list`,
`goals initiative list` and `goals goal get <id> --json`; never guess an ID. Add `--json` for
scripts and parse the JSON instead of the tables. Tables are for humans.

`goals goal delete` requires `--yes` and sends nothing without it. It deletes the goal and all
of its child goals, and keeps the goal-log history. Weekly and daily goals require `--week`
for `complete` and `reopen`; the error names the current ISO week. Quarterly goals default to
the first week of the quarter server-side, and a quarterly goal created without `--week` also
uses the first week of the quarter.

Scopes: `quarterly` needs `--year` and `--quarter`; `weekly` and `daily` need `--year`,
`--quarter` and `--week`, and daily goals also need `--day`; `adhoc` needs `--year` and
rejects `--quarter`. `--domain` applies to adhoc goals only and cannot be combined with
`--no-adhoc` on export.

## Command map

```bash
goals auth login
goals auth login --name dev --env dev
goals auth logout
goals auth logout --as dev
goals auth status
goals auth status --as dev --json
goals auth list
goals auth list --json
goals auth use dev
```

```bash
goals goal list --year 2026 --quarter 3
goals goal list --scope weekly --year 2026 --quarter 3 --week 31
goals goal list --scope daily --year 2026 --quarter 3 --week 31
goals goal list --scope adhoc --year 2026
goals goal list --year 2026 --quarter 3 --initiative <initiative-id> --limit 50 --json
goals goal get <goal-id>
goals goal get <goal-id> --json
goals goal create --scope quarterly --year 2026 --quarter 3 --title "Ship the beta" --details "Beta scope" --initiative <initiative-id>
goals goal create --scope weekly --parent <quarterly-goal-id> --title "Draft the launch"
goals goal create --scope daily --parent <weekly-goal-id> --day tue --title "Call the printer"
goals goal create --scope adhoc --year 2026 --week 31 --title "Book the venue" --domain <domain-id>
goals goal rename <goal-id> --title "Ship the beta"
goals goal complete <goal-id> --week 31
goals goal complete <goal-id> --include-children
goals goal reopen <goal-id> --week 31
goals goal reopen <goal-id> --include-children
goals goal delete <goal-id> --yes
```

```bash
goals initiative list
goals initiative list --limit 50 --json
goals initiative get <initiative-id>
goals initiative get <initiative-id> --json
```

```bash
goals export markdown --year 2026
goals export markdown --year 2026 --quarter 3
goals export markdown --year 2026 --quarter 3 --completed-only
goals export markdown --year 2026 --quarter 3 --goal <goal-id>
goals export markdown --year 2026 --quarter 3 --domain <domain-id>
goals export markdown --year 2026 --quarter 3 --domain uncategorized
goals export markdown --year 2026 --quarter 3 --no-adhoc
goals export markdown --year 2026 --out goals-2026.md --as dev
```

```bash
goals skill activate
```

## Recipes

### Recipe a: Export a whole year as markdown

Print every quarter of the year, in order, then write the same document to a file.

```bash
goals export markdown --year 2026
goals export markdown --year 2026 --out goals-2026.md
```

### Recipe b: Export one quarter

Add `--quarter` to get that quarter's document only.

```bash
goals export markdown --year 2026 --quarter 3
```

### Recipe c: Export a quarter, completed goals only

`--completed-only` mirrors the webapp's completed export.

```bash
goals export markdown --year 2026 --quarter 3 --completed-only
```

### Recipe d: Export selected goals or a domain

Read the goal IDs from `goals goal list --json` first. `--goal` is repeatable and needs
`--quarter`. Use `--domain <domain-id>` (the `domainId` from `goals goal get <id> --json`) or
the literal `uncategorized` for adhoc goals without a domain. `--domain` cannot be combined
with `--no-adhoc`.

```bash
goals goal list --year 2026 --quarter 3 --json
goals export markdown --year 2026 --quarter 3 --goal <goal-id> --goal <goal-id>
goals export markdown --year 2026 --quarter 3 --domain <domain-id>
goals export markdown --year 2026 --quarter 3 --domain uncategorized
goals export markdown --year 2026 --quarter 3 --no-adhoc
```

### Recipe e: List this week's goals

Work out the current year, quarter (1-4) and ISO week first; `date +%G` prints the ISO year
and `date +%V` the ISO week on Linux and macOS.

```bash
goals goal list --scope weekly --year 2026 --quarter 3 --week 31
goals goal list --scope daily --year 2026 --quarter 3 --week 31
```

### Recipe f: Create a quarterly goal with weekly and daily children

Create the parent first and read its id from the `Created <scope> goal <id>.` line on stdout,
then pass it as `--parent`. Weekly and daily goals default `--week` to the current ISO week.

```bash
goals goal create --scope quarterly --year 2026 --quarter 3 --title "Ship the beta"
goals goal create --scope weekly --parent <quarterly-goal-id> --title "Draft the launch"
goals goal create --scope daily --parent <weekly-goal-id> --day tue --title "Call the printer"
```

### Recipe g: Mark a daily task complete

Find the goal id with `--json`, then complete it. `--week` is required for weekly and daily
goals.

```bash
goals goal list --scope daily --year 2026 --quarter 3 --week 31 --json
goals goal complete <goal-id> --week 31
```

### Recipe h: Switch identities

List the stored labels, set a default, or pass `--as` for a single command.

```bash
goals auth list
goals auth use dev
goals goal list --year 2026 --quarter 3 --as dev
```
