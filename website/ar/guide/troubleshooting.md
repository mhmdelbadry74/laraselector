# حل المشاكل

## لا يظهر أي عنصر معلَّم

تأكد أن `LARASELECTOR_ENABLED=true` وأن `APP_ENV` هي `local` أو `dev`، ثم نفّذ `php artisan view:clear` وأعد تحميل الصفحة.

## المتصفح يقول إن البروتوكول غير مسجل (PhpStorm)

سجّل JetBrains URL handler أو ثبّت الـ command-line launcher على نظامك.

## المحرر يفتح مسارًا خاطئًا مع Docker

اضبط `path_mapping`، مثلًا `['/var/www/html' => '/Users/me/project']`.

## لا يتم العثور على controller

يجب أن يكون داخل `php_inspect_paths` (الافتراضي `app/` و`routes/`). إجراءات Livewire غير مدعومة حاليًا.

## الإبلاغ عن مشكلة

افتح issue على [GitHub](https://github.com/mhmdelbadry74/laraselector/issues).
