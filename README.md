# LaraSelector

[![Packagist Version](https://img.shields.io/packagist/v/mhmdelbadry74/laraselector-laravel)](https://packagist.org/packages/mhmdelbadry74/laraselector-laravel)
[![Tests](https://github.com/mhmdelbadry74/laraselector/actions/workflows/tests.yml/badge.svg)](https://github.com/mhmdelbadry74/laraselector/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/mhmdelbadry74/laraselector)](LICENSE)
![PHP](https://img.shields.io/packagist/php-v/mhmdelbadry74/laraselector-laravel)

LaraSelector is a development-only Laravel tool: choose a rendered Blade element in Chrome and open its Blade source, page controller, or form-action controller in VS Code, Cursor, or PhpStorm. You need both the Laravel package and Chrome extension.

**English** | [العربية](README.ar.md)

📖 **Documentation:** [English](https://mhmdelbadry74.github.io/laraselector/) · [العربية](https://mhmdelbadry74.github.io/laraselector/ar/) · [Packagist](https://packagist.org/packages/mhmdelbadry74/laraselector-laravel)

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
LARASELECTOR_EDITOR=vscode   # vscode | cursor | zed | sublime | phpstorm | …
LARASELECTOR_EDITING=false   # true lets the extension save text/class/translation edits to your files
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
| `editing` | `false` | Allow saving text/class/translation edits to source (`LARASELECTOR_EDITING`). |
| `lang_paths` | `lang/`, `resources/lang` | Where translations are searched. |
| `css_paths` | `resources/css`, `sass`, `scss`, `less`, `public/css` | Where CSS classes are traced. |
| `inertia_paths` | `resources/js/Pages`, … | Where Inertia page components live. |
| `max_renders` / `nplus1_threshold` | `400` / `3` | Inspector limits. |

## Usage

1. Install the extension, open your local Laravel page.
2. Open LaraSelector and click **Start selecting**.
3. Hover an element, click it, and choose Blade / controller / form action. Press Escape to stop.

## What you can do

Click an element, then use the panel tabs:

| Tab | What it gives you |
| --- | --- |
| **Open** | Blade file, page controller, form action, Livewire class / `render()` / action. |
| **Data** | The variables passed to that view (secrets redacted). |
| **Stack** | Render stack page → layout → partial with timings. |
| **Queries** | Queries run by the view, with N+1 warnings. |
| **Route** | Name, methods, middleware, FormRequest and its rules. |
| **Text** | Matching `lang/` keys; edit text or translations and save to source. |
| **CSS** | Which stylesheet defines each class; edit the class list and save. |
| **Livewire / Alpine** | Component, public properties, `x-data`. |
| **Report** | Element screenshot + Markdown / Jira bug description. |
| **Compare** | Pin an element and diff it against another one, even on another page. |

Also: **Page info** (route, totals, N+1, Inertia component and props), a **render heatmap**, **Shift+click** multi-select with *Open all* / *Compare*. Editing is off until `LARASELECTOR_EDITING=true`. Run `php artisan view:clear` once after upgrading.

## Editors and navigation notes

Supported editors: `vscode`, `vscode-insiders`, `vscodium`, `cursor`, `windsurf`, `zed`, `sublime`, `phpstorm`, `idea`, `webstorm`, `textmate`, `nova`. VS Code-family editors use `<scheme>://file/…`, Zed `zed://file/…`, Sublime `subl://open`, JetBrains `<ide>://open?file=…&line=…`; register the editor's URL handler/launcher if the browser reports an unregistered protocol. Neovim has no URL scheme, so it cannot be targeted without a custom handler. Running in Docker/Sail/WSL? Set `path_mapping`, or type the project path in the extension popup ("Project path on this machine"). The extension shows only project-relative paths and opens the editor only after you pick an action.

Form navigation supports same-origin relative/absolute actions, implicit action, GET/POST, `_method` spoofing and submit-button `formaction`/`formmethod`. Dynamic JavaScript destinations and external origins are unsupported.

## Security

Development only. The package is gated at request/render time, so cached views stay inert once disabled or when the environment changes. Endpoints return 404 when inactive, require same-origin and a session token, never dispatch routes, and validate real paths (including symlinks) inside the allowlist. View data is redacted for keys such as `password`, `token`, `secret` and `api_key` and only travels between your local app and your browser. Writing to files is a separate opt-in (`LARASELECTOR_EDITING`), limited to Blade and lang files, refuses ambiguous edits, and every edit can be undone.

## Troubleshooting

Run `php artisan laraselector:doctor` to check your setup.

## Testing

```sh
composer install && composer test
```

## Chrome extension

[⬇ Download the latest extension ZIP](https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-chrome.zip) · [Step-by-step guide](https://mhmdelbadry74.github.io/laraselector/guide/chrome-extension)

Download the release ZIP, unzip it, and load the extracted directory from `chrome://extensions` → Developer mode → Load unpacked. On an enabled local Laravel page, open LaraSelector, click **Start selecting**, hover a marked element, click to open source, and press Escape to stop.

## Demo and development

```sh
cd examples/laravel-demo && composer install && cp .env.example .env
php artisan key:generate && php artisan view:clear && php artisan serve
cd ../../apps/chrome-extension && npm run build && npm run package
cd ../.. && composer install && composer test
```

## Compatibility and limitations

LaraSelector marks static HTML opening tags while Blade still has original source lines. It maps layouts, includes, loops, conditionals, rendered component views, and slot body content. It skips malformed markup, dynamic tags containing Blade expressions, component invocation tags, arbitrary Shadow DOM, and cross-origin iframes. Page controller navigation supports controllers, invokable controllers, inherited methods, and closures inside allowed paths. Livewire components and actions are resolved only through Livewire's own registry; browser-provided class names are never trusted.

## Privacy and support

Read [the privacy policy](PRIVACY.md). Open bugs through GitHub Issues. Licensed under the [MIT License](LICENSE).
