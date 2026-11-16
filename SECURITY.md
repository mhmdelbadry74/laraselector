# Security policy

LaraSelector is a development-only tool. Production is always denied.

## What it can read and write

- **Read**: view variables (secrets redacted by key name), queries, routes and the project's Blade, lang and stylesheet paths. Snapshots live in `storage/framework/laraselector` for at most an hour (30 files).
- **Write**: only when `LARASELECTOR_EDITING=true`. Edits are limited to Blade files in `inspect_paths` and files in `lang_paths`, require the session token and same origin, refuse ambiguous matches and keep an undo snapshot. Leave it off unless you need it.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: [Security → Report a vulnerability](https://github.com/mhmdelbadry74/laraselector/security/advisories/new).

Include the version, steps to reproduce, and the impact. You will get a reply as soon as possible, and a fix is released before details are made public.

## Supported versions

Only the latest release receives fixes.
