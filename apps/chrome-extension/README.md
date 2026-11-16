# LaraSelector Chrome extension

Pairs with the [`mhmdelbadry74/laraselector-laravel`](https://packagist.org/packages/mhmdelbadry74/laraselector-laravel) package.

**Install:** download the latest [ZIP](https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-chrome.zip) and follow the [step-by-step guide](https://mhmdelbadry74.github.io/laraselector/guide/chrome-extension).

**Build from source:** `npm run build` (output in `dist/`, load it as an unpacked extension) or `npm run package` to create `laraselector-chrome.zip`.

**Permissions:** `activeTab`, `scripting`, `storage` and `sidePanel` (host access is optional and per site; the UI is a side panel, a sidebar on Firefox). It injects after you open the panel and only talks to the active page's same-origin `__laraselector` routes. Screenshots use `activeTab` and never leave your machine; the optional "Project path" is stored locally per site.

**Features (package 0.2+):** element details panel (data, stack, queries, route, text/translations, CSS, Livewire/Alpine, report, compare), page info, render heatmap, Shift+click multi-select, and opt-in edit-in-place. See the [Features guide](https://mhmdelbadry74.github.io/laraselector/guide/features).

**Firefox:** `npm run package:firefox` builds `laraselector-firefox.zip` (Firefox 140+). It is experimental and not yet published on Firefox Add-ons.

## Publishing to the Chrome Web Store

Set `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` (Chrome Web Store API OAuth credentials), bump `version` in `src/manifest.json`, then:

```sh
npm run publish:chrome         # build, zip, upload as draft
npm run publish:chrome:submit  # same, then submit for review
```
