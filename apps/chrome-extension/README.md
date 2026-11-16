# LaraSelector Chrome extension

Pairs with the [`mhmdelbadry74/laraselector-laravel`](https://packagist.org/packages/mhmdelbadry74/laraselector-laravel) package.

**Install:** download the latest [ZIP](https://github.com/mhmdelbadry74/laraselector/releases/latest/download/laraselector-chrome.zip) and follow the [step-by-step guide](https://mhmdelbadry74.github.io/laraselector/guide/chrome-extension).

**Build from source:** `npm run build` (output in `dist/`, load it as an unpacked extension) or `npm run package` to create `laraselector-chrome.zip`.

**Permissions:** only `activeTab`, `scripting` and `storage`. It injects after a popup interaction and only talks to the active page's same-origin `__laraselector` routes.
