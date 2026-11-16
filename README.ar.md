# LaraSelector

[English](README.md) | **العربية**

📖 **التوثيق:** [العربية](https://mhmdelbadry74.github.io/laraselector/ar/) · [English](https://mhmdelbadry74.github.io/laraselector/) · [Packagist](https://packagist.org/packages/mhmdelbadry74/laraselector-laravel)

LaraSelector أداة للتطوير فقط (Development) لـ Laravel: تختار أي عنصر معروض في Chrome، وتفتح مصدره مباشرة في المحرر: ملف Blade، أو الـ Controller الخاص بالصفحة، أو الـ Controller الخاص بالـ form action. المحررات المدعومة: VS Code وCursor وPhpStorm. تحتاج إلى الـ package (Laravel) وإضافة Chrome معًا.

## المتطلبات

- PHP 8.1 أو أحدث، وLaravel 10 أو 11 أو 12
- إضافة LaraSelector لمتصفح Chrome (التفاصيل بالأسفل)
- VS Code أو Cursor أو PhpStorm

## التثبيت عن طريق Composer

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```

الـ Service Provider يتسجل تلقائيًا (auto-discovery).

## الإعداد

أضف في ملف `.env`:

```dotenv
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
```

ثم امسح الـ views المترجمة: `php artisan view:clear`.

ملف الإعدادات `config/laraselector.php`:

| المفتاح | القيمة الافتراضية | الوظيفة |
| --- | --- | --- |
| `enabled` | `false` | مفتاح التشغيل الرئيسي (`LARASELECTOR_ENABLED`). |
| `environments` | `local`, `dev` | البيئات المسموح بها. بيئة `production` مرفوضة دائمًا. |
| `editor` | `vscode` | المحرر المستخدم لبناء الرابط. |
| `application_root` | `base_path()` | الجذر المستخدم لعرض المسارات النسبية. |
| `path_mapping` | `[]` | ربط المسارات، مثلًا مع Docker: `['/var/www/html' => '/Users/me/project']`. |
| `inspect_paths` | `resources/views` | مجلدات Blade التي يتم تعليمها. |
| `php_inspect_paths` | `app/`, `routes/` | مجلدات PHP المسموح فتح الـ controllers منها. |
| `exclude_paths` | `resources/views/vendor` | مسارات Blade المستبعدة. |
| `token_ttl_seconds` | `300` | مدة صلاحية الـ token. |

## الاستخدام

1. ثبّت إضافة Chrome وافتح صفحة Laravel المحلية.
2. افتح LaraSelector واضغط **Start selecting**.
3. مرّر الماوس على عنصر ثم اضغط عليه، واختر Blade أو controller أو form action. اضغط Escape للإيقاف.

## إضافة Chrome

[⬇ نزّل أحدث نسخة من الإضافة](https://github.com/mhmdelbadry74/laraselector/releases/latest/download/laraselector-chrome.zip) · [الدليل خطوة بخطوة](https://mhmdelbadry74.github.io/laraselector/ar/guide/chrome-extension)

نزّل ملف ZIP الخاص بالإصدار، وفك الضغط، ثم افتح `chrome://extensions` ← فعّل Developer mode ← **Load unpacked** واختر المجلد.

## ملاحظات المحررات والتنقل

يستخدم VS Code وCursor بروتوكولي `vscode://file` و`cursor://file`. أما PhpStorm فيستخدم `phpstorm://open?file=…&line=…`؛ سجّل JetBrains URL handler إذا ظهرت رسالة بروتوكول غير مسجل. الإضافة تعرض المسارات النسبية للمشروع فقط، ولا تفتح المحرر إلا بعد اختيارك لإجراء.

يدعم التنقل للنماذج (forms): الـ actions النسبية والمطلقة من نفس الـ origin، وغياب الـ action، وGET/POST، و`_method` spoofing، و`formaction`/`formmethod` في زر الإرسال. وجهات JavaScript الديناميكية والـ origins الخارجية غير مدعومة.

## الأمان

للتطوير فقط. يتم التحقق من التفعيل وقت الطلب/العرض، فالـ views المخزنة لا تعمل بعد التعطيل أو تغيير البيئة. تُرجع الـ endpoints الخطأ 404 عند عدم التفعيل، وتتطلب same-origin وsession token، ولا تنفّذ الـ routes أبدًا، وتتحقق من المسارات الحقيقية (بما فيها الـ symlinks) داخل القائمة المسموحة.

## القيود

يعلّم LaraSelector وسوم HTML الثابتة، ويدعم layouts وincludes والحلقات والشروط وviews الـ components وslots. يتجاهل الوسوم الديناميكية التي تحتوي تعبيرات Blade، ووسوم استدعاء الـ components، وShadow DOM، والـ iframes من origin آخر. التنقل لإجراءات Livewire غير متاح حاليًا.

## حل المشاكل

نفّذ `php artisan laraselector:doctor` لفحص إعداداتك.

## الاختبارات والتطوير

```sh
composer install && composer test
```

مشروع تجريبي: `examples/laravel-demo`.

## الرخصة والخصوصية

الرخصة [MIT](LICENSE). راجع [سياسة الخصوصية](PRIVACY.md). للإبلاغ عن مشاكل استخدم GitHub Issues.
