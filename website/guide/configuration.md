# Configuration

Published to `config/laraselector.php`.

| Key | Default | Purpose |
| --- | --- | --- |
| `enabled` | `false` | Master switch, set through `LARASELECTOR_ENABLED`. |
| `environments` | `local`, `dev` | Environments where it may run. `production` is always denied. |
| `editor` | `vscode` | Editor for the generated link: one of `vscode`, `vscode-insiders`, `vscodium`, `cursor`, `windsurf`, `zed`, `sublime`, `phpstorm`, `idea`, `webstorm`, `textmate`, `nova`. |
| `application_root` | `base_path()` | Root used to display project-relative paths. |
| `path_mapping` | `[]` | Map server paths to local paths. |
| `inspect_paths` | `resources/views` | Blade directories that get marked. |
| `php_inspect_paths` | `app/`, `routes/` | PHP directories controllers may be opened from. |
| `exclude_paths` | `resources/views/vendor` | Blade paths to skip. |
| `token_ttl_seconds` | `300` | Lifetime of source tokens, in seconds. |
| `editing` | `false` | Allow saving text/class/translation edits to source (`LARASELECTOR_EDITING`). |
| `lang_paths` | `lang/`, `resources/lang` | Where translations are searched. |
| `css_paths` | `resources/css`, `sass`, `scss`, `less`, `public/css` | Where CSS classes are traced. |
| `inertia_paths` | `resources/js/Pages`, … | Where Inertia page components live. |
| `max_renders` / `nplus1_threshold` | `400` / `3` | Inspector limits. |

## Docker and remote setups

```php
'path_mapping' => ['/var/www/html' => '/Users/me/project'],
```

## Editors

VS Code-family editors use `<scheme>://file`, Zed uses `zed://file`, Sublime `subl://open`, JetBrains `<ide>://open`; register JetBrains' URL handler if the browser reports an unregistered protocol.

## Forms

Supported: same-origin relative or absolute actions, GET/POST, `_method` spoofing and `formaction`/`formmethod` on the submit button. Not supported: dynamic JavaScript destinations and external origins.

## Limitations

LaraSelector marks static HTML tags. It skips malformed markup, dynamic tags containing Blade expressions, component invocation tags, arbitrary Shadow DOM and cross-origin iframes.
