# Getting started

## Requirements

- PHP 8.1+ and Laravel 10, 11 or 12
- The LaraSelector Chrome extension
- VS Code, Cursor, Zed, Sublime Text, PhpStorm or another [supported editor](/guide/configuration#editors)

## Install the package

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

The service provider is auto-discovered.

## Enable it

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | zed | sublime | phpstorm | …
LARASELECTOR_EDITING=false   # true lets you save text/class edits to your files
```

```sh
php artisan view:clear
```

::: tip
It only runs in the `local` and `dev` environments. Production is always denied, even if enabled.
:::

## Install the Chrome extension

[Download the extension](/guide/chrome-extension) and load it in Chrome. The page has step-by-step instructions.

## Use it

1. Open your local Laravel page.
2. Click the LaraSelector icon to open its side panel and press **Select**.
3. Hover an element and click it. A panel opens: open its Blade file, controller or form action, or look at its data, queries, route and more (see [Features](/guide/features)).
4. Your editor opens at the exact line. Press **Escape** to close the panel or stop selecting.

Upgrading from 0.1? Run `composer update` and `php artisan view:clear` once, and update the extension, to get the details panel.
