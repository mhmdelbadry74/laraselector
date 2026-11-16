# Changelog

## 0.2.0 - 2026-11-16
- **Element details panel**: click an element to see the variables passed to its view (secrets redacted), the render stack (page → layout → partial), the queries it ran with N+1 detection, and its route (name, middleware, FormRequest and its validation rules).
- **Page info** and **render heatmap**: per-request totals, every Blade file's render time, and an overlay that colours each partial by how slow it is.
- **Livewire/Alpine inspector**: component class, public properties (snapshot) and `render()`; Alpine `x-data`.
- **Inertia**: shows the page component and props and opens the Vue/React/Svelte file.
- **Translation finder**: click text to find its `lang/` key (PHP and JSON), in every locale.
- **CSS tracing**: shows which stylesheet defines each class, marks Tailwind/utility classes, opens `tailwind.config.*`.
- **Edit in place** (off by default, `LARASELECTOR_EDITING=true`): change text, class lists or translations from the page and save them to your Blade/lang file, with undo. Refuses ambiguous matches and files outside the allowlists.
- **Bug report**: element screenshot (copy / download) and a ready-made Markdown or Jira description with source, route, stack and data.
- **Multi-select and compare**: Shift+click several elements, open them all, compare two (or pin one and compare it on another page).
- **More editors**: `vscode-insiders`, `vscodium`, `windsurf`, `zed`, `sublime`, `idea`, `webstorm`, `textmate`, `nova`. New "Project path on this machine" option for Docker/Sail/WSL, and `laraselector:doctor` warns when it is needed.
- Extension UI is now a side panel that also shows all element details (the old in-page drawer is gone) (a sidebar on Firefox) with connection status, Select / Page info / Heatmap, settings and shortcuts. The keyboard shortcut also opens it. Per-site access can be granted from the panel.
- Protocol 3. The package adds `inspect`, `page`, `edit` and `undo` endpoints, a response-tagging middleware and render recording in compiled views. Run `php artisan view:clear` after upgrading.
- New config keys: `editing`, `lang_paths`, `css_paths`, `inertia_paths`, `max_renders`, `nplus1_threshold`.
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
