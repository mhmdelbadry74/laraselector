# البدء السريع

## المتطلبات

- PHP 8.1 أو أحدث، وLaravel 10 أو 11 أو 12
- إضافة LaraSelector لـ Chrome
- VS Code أو Cursor أو Zed أو Sublime Text أو PhpStorm أو أي [محرر مدعوم](/ar/guide/configuration)

## تثبيت الـ package

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

الـ Service Provider يتسجل تلقائيًا.

## التفعيل

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | zed | sublime | phpstorm | …
LARASELECTOR_EDITING=false   # true يسمح بحفظ تعديلات النص والـ classes في ملفاتك
```

```sh
php artisan view:clear
```

::: tip ملاحظة
يعمل فقط في بيئتي `local` و`dev`. بيئة production مرفوضة دائمًا حتى لو فعّلته.
:::

## تثبيت إضافة Chrome

[نزّل الإضافة](/ar/guide/chrome-extension) وحمّلها في Chrome. الصفحة فيها الخطوات بالتفصيل.

## الاستخدام

1. افتح صفحة Laravel المحلية.
2. اضغط أيقونة LaraSelector لتفتح لوحتها الجانبية ثم اضغط **Select**.
3. مرّر على أي عنصر واضغط عليه. ستفتح لوحة: افتح ملف Blade أو الـ controller أو form action، أو شاهد بياناته واستعلاماته والـ route وغيرها (انظر [المميزات](/ar/guide/features)).
4. سيفتح محررك عند السطر المقصود. اضغط **Escape** لإغلاق اللوحة أو إيقاف التحديد.

تحدّث من 0.1؟ نفّذ `composer update` و`php artisan view:clear` مرة واحدة وحدّث الإضافة لتظهر لوحة التفاصيل.
