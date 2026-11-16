# Troubleshooting

Start with the built-in check, it tells you what is wrong:

```sh
php artisan laraselector:doctor
```

## No element is marked

Check `LARASELECTOR_ENABLED=true` and that `APP_ENV` is `local` or `dev`, then run `php artisan view:clear` and reload.

## The panel has no Data / Queries / Stack tabs

Update the package, run `php artisan view:clear` (compiled views must be rebuilt once) and reload the page. The extension also needs to be 0.2 or newer.

## "Editing is off"

Add `LARASELECTOR_EDITING=true` to `.env` and reload. Saves are refused when the text is ambiguous, comes from a variable or the file changed; edit those in your editor.

## The browser says the protocol is not registered (PhpStorm)

Register JetBrains' URL handler or install its command-line launcher on your OS.

## The editor opens the wrong path with Docker

Set `path_mapping`, for example `['/var/www/html' => '/Users/me/project']`, or type the path in **Project path on this machine** in the side panel settings (gear icon).

## A controller is not found

It must live inside `php_inspect_paths` (default `app/` and `routes/`).

## Report a bug

Open an issue on [GitHub](https://github.com/mhmdelbadry74/laraselector/issues).
