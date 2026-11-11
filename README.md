# LaraSelector

LaraSelector is a development-only Laravel tool: choose a rendered Blade element in Chrome and open its Blade source, page controller, or form-action controller in VS Code, Cursor, or PhpStorm. You need both the Laravel package and Chrome extension.

## Beta install

Until Packagist publication, add a VCS repository to your application's `composer.json` and require the beta branch:

```sh
composer config repositories.laraselector vcs https://github.com/mhmdelbadry74/laraselector.git
composer require --dev mhmdelbadry74/laraselector-laravel:dev-feature/laraselector-release
php artisan vendor:publish --tag=laraselector-config
```

Set `LARASELECTOR_ENABLED=true` and `LARASELECTOR_EDITOR=vscode` (or `cursor` / `phpstorm`) in `.env`. The default allowlist is `local,dev`; production is always denied, even if it is enabled or incorrectly allowlisted. The package runtime-gates compiled views and all development endpoints, so cached marked views cannot expose usable attributes after disabling it or changing environment. Running `php artisan view:clear` is still recommended after configuration deployment.

Use `php_inspect_paths` to limit PHP navigation (default: `app/` and `routes/`). The extension displays only project-relative paths, and sends a deliberate browser navigation to the editor only after you select an action. Form navigation supports same-origin relative/absolute actions, implicit action, GET/POST, `_method` spoofing, and submit-button `formaction`/`formmethod`; routes are matched against a synthetic request and never dispatched. Dynamic JavaScript destinations and external origins are intentionally unsupported. PHP targets are validated with real paths, including symlink checks.

VS Code/Cursor use their documented `vscode://file` and `cursor://file` handlers. PhpStorm uses `phpstorm://open?file=…&line=…`; install/register JetBrains' command-line launcher/URL handler on your OS if the browser reports an unregistered protocol. `path_mapping` applies to Blade and PHP paths, for example `['/var/www/html' => '/Users/me/project']`.

## Chrome extension

Download the release ZIP, unzip it, and load the extracted directory from `chrome://extensions` → Developer mode → Load unpacked. On an enabled local Laravel page, open LaraSelector, click **Start selecting**, hover a marked element, click to open source, and press Escape to stop.

## Demo and development

```sh
cd examples/laravel-demo && composer install && cp .env.example .env
php artisan key:generate && php artisan view:clear && php artisan serve
cd ../../apps/chrome-extension && npm run build && npm run package
cd ../../packages/laravel && composer install && composer test
```

## Compatibility and limitations

LaraSelector marks static HTML opening tags while Blade still has original source lines. It maps layouts, includes, loops, conditionals, rendered component views, and slot body content. It skips malformed markup, dynamic tags containing Blade expressions, component invocation tags, arbitrary Shadow DOM, and cross-origin iframes. Page controller navigation supports controllers, invokable controllers, inherited methods, and closures inside allowed paths. Livewire action navigation is not currently exposed: Livewire component/action metadata varies by version and browser-provided class names are never trusted; all non-Livewire navigation continues to work when it is installed.

## Privacy and support

Read [the privacy policy](PRIVACY.md). Open bugs through GitHub Issues. This repository has no license yet; choose one before describing it as open source.
