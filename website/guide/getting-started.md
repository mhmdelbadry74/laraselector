# Getting started

## Requirements

- PHP 8.1+ and Laravel 10, 11 or 12
- The LaraSelector Chrome extension
- VS Code, Cursor or PhpStorm

## Install the package

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

The service provider is auto-discovered.

## Enable it

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
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
2. Open LaraSelector from the toolbar and click **Start selecting**.
3. Hover an element and click it, then choose Blade, page controller or form action.
4. Your editor opens at the exact line. Press **Escape** to stop selecting.
