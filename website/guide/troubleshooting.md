# Troubleshooting

Start with the built-in check, it tells you what is wrong:

```sh
php artisan laraselector:doctor
```

## No element is marked

Check `LARASELECTOR_ENABLED=true` and that `APP_ENV` is `local` or `dev`, then run `php artisan view:clear` and reload.

## The browser says the protocol is not registered (PhpStorm)

Register JetBrains' URL handler or install its command-line launcher on your OS.

## The editor opens the wrong path with Docker

Set `path_mapping`, for example `['/var/www/html' => '/Users/me/project']`.

## A controller is not found

It must live inside `php_inspect_paths` (default `app/` and `routes/`). Livewire actions are not supported yet.

## Report a bug

Open an issue on [GitHub](https://github.com/mhmdelbadry74/laraselector/issues).
