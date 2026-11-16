# Chrome extension

The extension talks to the package running in your local Laravel app. Install both.

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/releases/latest/download/laraselector-chrome.zip">⬇ Download the extension (.zip)</a>

Always the latest build. Older versions are on the [Releases page](https://github.com/mhmdelbadry74/laraselector/releases).

## Install in Chrome

1. **Download** the ZIP above and **unzip** it. Keep the extracted folder somewhere permanent, Chrome loads it from there.
2. Open `chrome://extensions` in the address bar.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and choose the **extracted folder** (the one that contains `manifest.json`).
5. Click the puzzle icon in the toolbar and **pin** LaraSelector.

Works in other Chromium browsers too (Edge, Brave, Arc) using their `://extensions` page.

## Firefox

::: warning Experimental
The Firefox build is new and has not been through a store review yet. Firefox only keeps unsigned add-ons until you restart it.
:::

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/releases/latest/download/laraselector-firefox.zip">⬇ Download the Firefox build (.zip)</a>

1. Download the ZIP (you do not need to unzip it).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and choose the ZIP (or its `manifest.json`).
4. Use it like in Chrome. Requires Firefox 140 or newer.

The add-on is removed when Firefox restarts. A signed, permanent version will be available once it is published on Firefox Add-ons.

## Use it

1. Open your local Laravel page (the package must be [enabled](/guide/getting-started)).
2. Click the LaraSelector icon, then **Start selecting**.
3. Hover an element and click it, then choose Blade, page controller or form action.
4. Press **Escape** to stop.

## Permissions

Only `activeTab`, `scripting` and `storage`. It injects after you interact with the popup and talks only to the active page's same-origin `__laraselector` routes.

## Updating

Download the new ZIP, replace the contents of your folder, then click the reload icon on the extension card in `chrome://extensions`.

::: tip Chrome says "Load unpacked" is missing?
Make sure **Developer mode** is on. If Chrome reports a manifest error, you selected the ZIP or a parent folder: choose the folder that directly contains `manifest.json`.
:::
