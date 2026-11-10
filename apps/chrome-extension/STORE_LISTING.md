# Chrome Web Store listing

**Short description:** Jump from a local Laravel page element to its Blade source in VS Code or Cursor.

**Full description:** LaraSelector is a local-development companion for Laravel developers. Activate selection on an explicitly opened tab, hover an instrumented Blade element to see its source location, then click to open its Blade template in VS Code or Cursor. It requires the LaraSelector Laravel package to be enabled only in your local application.

**Single purpose:** Help a developer locate the Blade template and original line responsible for a rendered element in their own local Laravel application.

**Permissions:** `activeTab` grants temporary access only after the developer opens the popup; `scripting` injects the selector into that selected tab; `storage` is reserved for future local preferences and currently stores no page data.

**Privacy declaration:** The extension handles website content and a same-origin session handshake solely to provide selection and source resolution. Requests are sent only to the active local Laravel page's origin. No data is sent to LaraSelector's developer or third parties. Privacy policy URL after GitHub publish: `https://github.com/mhmdelbadry74/laraselector/blob/feature/laraselector-release/PRIVACY.md`.

**Reviewer instructions:** Clone the repository, run the demo in `examples/laravel-demo` using the root README, load the ZIP/unpacked `dist`, open the local URL, and select an element. The Laravel package is required; no login is required.
