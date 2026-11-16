# حل المشاكل

ابدأ بأمر الفحص المدمج، فهو يخبرك بما هو خاطئ:

```sh
php artisan laraselector:doctor
```

## لا يظهر أي عنصر معلَّم

تأكد أن `LARASELECTOR_ENABLED=true` وأن `APP_ENV` هي `local` أو `dev`، ثم نفّذ `php artisan view:clear` وأعد تحميل الصفحة.

## لا تظهر تبويبات Data / Queries / Stack

حدّث الـ package ونفّذ `php artisan view:clear` (يجب إعادة بناء الـ views مرة واحدة) وأعد تحميل الصفحة. وتأكد أن الإضافة 0.2 أو أحدث.

## رسالة "Editing is off"

أضف `LARASELECTOR_EDITING=true` في `.env` وأعد التحميل. يُرفض الحفظ إذا كان النص مكررًا أو آتيًا من متغير أو تغيّر الملف؛ عدّل هذه الحالات من محررك.

## المتصفح يقول إن البروتوكول غير مسجل (PhpStorm)

سجّل JetBrains URL handler أو ثبّت الـ command-line launcher على نظامك.

## المحرر يفتح مسارًا خاطئًا مع Docker

اضبط `path_mapping`، مثلًا `['/var/www/html' => '/Users/me/project']`، أو اكتب المسار في **Project path on this machine** في نافذة الإضافة.

## لا يتم العثور على controller

يجب أن يكون داخل `php_inspect_paths` (الافتراضي `app/` و`routes/`).

## الإبلاغ عن مشكلة

افتح issue على [GitHub](https://github.com/mhmdelbadry74/laraselector/issues).
