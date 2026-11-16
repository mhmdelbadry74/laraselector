# Changelog

## Unreleased
- Livewire support: select an element inside a Livewire component and open its `wire:click`/`wire:submit` action or the component class (v2, v3, v4; Volt actions are found inside the Blade file).
- `npm run publish:chrome` / `publish:chrome:submit` upload the extension to the Chrome Web Store (`apps/chrome-extension/publish-chrome.mjs`).
- Experimental Firefox build of the extension (`npm run package:firefox`, attached to releases).
- Extension: fixed `Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.` (state messages sent with no listener are now ignored).
- Extension ZIPs are tracked in git; download links point to the latest file on `main`.
- Docs: removed the "Edit this page" link.

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
