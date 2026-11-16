# LaraSelector

LaraSelector is a development-only Laravel tool: choose a rendered Blade element in Chrome and open its Blade source, page controller, or form-action controller in VS Code, Cursor, or PhpStorm. You need both the Laravel package and Chrome extension.

**English** | [العربية](README.ar.md)

## Requirements

- PHP 8.1+ and Laravel 10, 11 or 12
- The LaraSelector Chrome extension (see below)
- VS Code, Cursor or PhpStorm

## Installation

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

The service provider is auto-discovered.

## Configuration

Add to `.env`:

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
```

Then clear compiled views: `php artisan view:clear`.

Config file `config/laraselector.php`:

| Key | Default | Purpose |
| --- | --- | --- |
| `enabled` | `false` | Master switch (`LARASELECTOR_ENABLED`). |
| `environments` | `local`, `dev` | Allowed environments. `production` is always denied. |
| `editor` | `vscode` | Editor used to build the link. |
| `application_root` | `base_path()` | Root used for project-relative paths. |
| `path_mapping` | `[]` | Map paths, e.g. Docker: `['/var/www/html' => '/Users/me/project']`. |
| `inspect_paths` | `resources/views` | Blade directories that are marked. |
| `php_inspect_paths` | `app/`, `routes/` | PHP directories controllers may be opened from. |
| `exclude_paths` | `resources/views/vendor` | Excluded Blade paths. |
| `token_ttl_seconds` | `300` | Lifetime of source tokens. |

## Usage

1. Install the extension, open your local Laravel page.
2. Open LaraSelector and click **Start selecting**.
3. Hover an element, click it, and choose Blade / controller / form action. Press Escape to stop.

## Editors and navigation notes

VS Code/Cursor use the `vscode://file` and `cursor://file` handlers. PhpStorm uses `phpstorm://open?file=…&line=…`; register JetBrains' URL handler/launcher if the browser reports an unregistered protocol. The extension shows only project-relative paths and opens the editor only after you pick an action.

Form navigation supports same-origin relative/absolute actions, implicit action, GET/POST, `_method` spoofing and submit-button `formaction`/`formmethod`. Dynamic JavaScript destinations and external origins are unsupported.

## Security

Development only. The package is gated at request/render time, so cached views stay inert once disabled or when the environment changes. Endpoints return 404 when inactive, require same-origin and a session token, never dispatch routes, and validate real paths (including symlinks) inside the allowlist.

## Testing

```sh
composer install && composer test
```

## Chrome extension

Download the release ZIP, unzip it, and load the extracted directory from `chrome://extensions` → Developer mode → Load unpacked. On an enabled local Laravel page, open LaraSelector, click **Start selecting**, hover a marked element, click to open source, and press Escape to stop.

## Demo and development

```sh
cd examples/laravel-demo && composer install && cp .env.example .env
php artisan key:generate && php artisan view:clear && php artisan serve
cd ../../apps/chrome-extension && npm run build && npm run package
cd ../.. && composer install && composer test
```

## Compatibility and limitations

LaraSelector marks static HTML opening tags while Blade still has original source lines. It maps layouts, includes, loops, conditionals, rendered component views, and slot body content. It skips malformed markup, dynamic tags containing Blade expressions, component invocation tags, arbitrary Shadow DOM, and cross-origin iframes. Page controller navigation supports controllers, invokable controllers, inherited methods, and closures inside allowed paths. Livewire action navigation is not currently exposed: Livewire component/action metadata varies by version and browser-provided class names are never trusted; all non-Livewire navigation continues to work when it is installed.

## Privacy and support

Read [the privacy policy](PRIVACY.md). Open bugs through GitHub Issues. Licensed under the [MIT License](LICENSE).
