# LaraSelector

LaraSelector is a local Laravel developer tool: choose a rendered Blade element in Chrome and open its defining Blade file and line in VS Code or Cursor. You need both the Laravel package and Chrome extension.

## Beta install

Until Packagist publication, add a VCS repository to your application's `composer.json` and require the beta branch:

```sh
composer config repositories.laraselector vcs https://github.com/mhmdelbadry74/laraselector.git
composer require --dev mhmdelbadry74/laraselector-laravel:dev-feature/laraselector-release
php artisan vendor:publish --tag=laraselector-config
```

Set `LARASELECTOR_ENABLED=true` and `LARASELECTOR_EDITOR=vscode` (or `cursor`) in `.env`, then run `php artisan view:clear`. Docker mapping example: `['/var/www/html' => '/Users/me/project']` in `config/laraselector.php`.

## Chrome extension

Download the release ZIP, unzip it, and load the extracted directory from `chrome://extensions` → Developer mode → Load unpacked. On an enabled local Laravel page, open LaraSelector, click **Start selecting**, hover a marked element, click to open source, and press Escape to stop.

## Demo and development

```sh
cd examples/laravel-demo && composer install && cp .env.example .env
php artisan key:generate && php artisan view:clear && php artisan serve
cd ../../apps/chrome-extension && npm run build && npm run package
cd ../../packages/laravel && composer install && composer test
```

## Limitations

LaraSelector marks static HTML opening tags while Blade still has original source lines. It maps layouts, includes, loops, conditionals, rendered component views, and slot body content. It skips malformed markup, dynamic tags containing Blade expressions, component invocation tags, arbitrary Shadow DOM, and cross-origin iframes. Changing enablement requires `view:clear`.

## Privacy and support

Read [the privacy policy](PRIVACY.md). Open bugs through GitHub Issues. This repository has no license yet; choose one before describing it as open source.
