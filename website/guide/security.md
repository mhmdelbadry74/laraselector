# Security

LaraSelector is for development only.

- Activation is checked at request and render time, so cached views go inert once it is disabled.
- Endpoints return 404 when inactive and require same-origin plus a session token.
- Routes are matched against a synthetic request and never dispatched.
- Real paths, symlinks included, must stay inside the allowlist.
- The extension shows only project-relative paths and opens the editor only after you choose an action.

See the [privacy policy](https://github.com/mhmdelbadry74/laraselector/blob/main/PRIVACY.md).
