# البدء السريع

## المتطلبات

- PHP 8.1 أو أحدث، وLaravel 10 أو 11 أو 12
- إضافة LaraSelector لـ Chrome
- VS Code أو Cursor أو PhpStorm

## تثبيت الـ package

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

الـ Service Provider يتسجل تلقائيًا.

## التفعيل

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
```

```sh
php artisan view:clear
```

::: tip ملاحظة
يعمل فقط في بيئتي `local` و`dev`. بيئة production مرفوضة دائمًا حتى لو فعّلته.
:::

## تثبيت إضافة Chrome

نزّل ملف ZIP من [Releases](https://github.com/mhmdelbadry74/laraselector/releases)، وفك ضغطه، ثم افتح `chrome://extensions` وفعّل **Developer mode** واختر **Load unpacked**.

## الاستخدام

1. افتح صفحة Laravel المحلية.
2. افتح LaraSelector من شريط الأدوات واضغط **Start selecting**.
3. مرّر على أي عنصر واضغط عليه، ثم اختر Blade أو controller الصفحة أو form action.
4. سيفتح محررك عند السطر المقصود. اضغط **Escape** لإيقاف التحديد.
