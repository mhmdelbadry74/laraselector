# Chrome extension

The extension talks to the package running in your local Laravel app. Install both.

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-chrome.zip">⬇ Download the extension (.zip)</a>

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

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-firefox.zip">⬇ Download the Firefox build (.zip)</a>

1. Download the ZIP (you do not need to unzip it).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and choose the ZIP (or its `manifest.json`).
4. Use it like in Chrome. Requires Firefox 140 or newer.

The add-on is removed when Firefox restarts. A signed, permanent version will be available once it is published on Firefox Add-ons.

## Use it

1. Open your local Laravel page (the package must be [enabled](/guide/getting-started)).
2. Click the LaraSelector icon: a **side panel** opens. Press **Select**.
3. Hover an element and click it to open the details panel ([Features](/guide/features)). **Shift+click** selects several elements.
4. **Page info** and **Heatmap** in the side panel show page-level data and render times.
5. Press **Escape** to close the panel or stop.

Using Docker, Sail or WSL? Type your project path into **Project path on this machine** (gear icon in the side panel) so editor links open on your computer.

## Permissions

`activeTab`, `scripting`, `storage` and `sidePanel`. Host access is optional: if the panel says it needs access to a tab, click **Allow on this site** (or click the toolbar icon on that tab). Screenshots use `activeTab` and stay on your machine. It injects after you open the side panel or click the icon and talks only to the active page's same-origin `__laraselector` routes.

## Updating

Download the new ZIP, replace the contents of your folder, then click the reload icon on the extension card in `chrome://extensions`.

::: tip Chrome says "Load unpacked" is missing?
Make sure **Developer mode** is on. If Chrome reports a manifest error, you selected the ZIP or a parent folder: choose the folder that directly contains `manifest.json`.
:::
