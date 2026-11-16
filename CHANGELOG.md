# Changelog

## 0.1.1 - 2026-11-16

### Security
- `resolve` no longer accepts a request when no handshake happened (an empty session token matched an empty header).

### Added
- `php artisan laraselector:doctor` checks the configuration and explains what is wrong.
- Tests for every endpoint (activation, origin, session token, editors, path mapping).
- Laravel Pint code style check in CI (`pint.json`).

### Changed
- Source code reformatted for readability (no behavior change).
- CI now installs and tests each Laravel version (10, 11, 12) for real.

## 0.1.0
- First Composer release.
