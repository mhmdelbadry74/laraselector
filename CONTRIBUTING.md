# Contributing

Thanks for helping! Issues and pull requests are welcome.

## Setup

```sh
git clone https://github.com/mhmdelbadry74/laraselector.git
cd laraselector
composer install
composer test
```

PHP 8.1+ is supported. Code style uses [Laravel Pint](https://laravel.com/docs/pint) (needs PHP 8.3): `composer require --dev laravel/pint && vendor/bin/pint src config tests`.

## Docs site

```sh
cd website && npm install && npm run dev
```

Pages exist in English (`website/`) and Arabic (`website/ar/`). Please update both.

## Pull requests

- Add or update tests for behavior changes.
- Keep `composer test` green and add a line to `CHANGELOG.md`.
- Never weaken the security rules (production denied, same-origin, session token, path allowlist).
