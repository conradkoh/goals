# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 - 2026-11-20

### Added

- Browser-approved login with a verification code, plus multiple named identities that can be
  listed, selected and revoked.
- `goals goal` commands to list, read, create, rename, complete, reopen and delete quarterly,
  weekly, daily and adhoc goals.
- `goals initiative` commands to list initiatives and the goals tagged with them.
- `goals export markdown` for a whole year or one quarter, matching the webapp markdown export.
- `goals skill activate`, which prints the versioned agent skill stub and full reference.
- Production endpoints as the default for `goals auth login`, so logging in needs no flags.
