# الإعدادات

يتم نشرها في `config/laraselector.php`.

| المفتاح | الافتراضي | الوظيفة |
| --- | --- | --- |
| `enabled` | `false` | المفتاح الرئيسي للتشغيل، ويتحكم فيه `LARASELECTOR_ENABLED`. |
| `environments` | `local`, `dev` | البيئات المسموح بالتشغيل فيها. بيئة `production` مرفوضة دائمًا. |
| `editor` | `vscode` | المحرر المستخدم في الرابط: `vscode` أو `cursor` أو `phpstorm`. |
| `application_root` | `base_path()` | الجذر المستخدم لعرض المسارات نسبةً إلى المشروع. |
| `path_mapping` | `[]` | ربط مسارات السيرفر بمسارات جهازك. |
| `inspect_paths` | `resources/views` | مجلدات Blade التي يتم تعليمها. |
| `php_inspect_paths` | `app/`, `routes/` | مجلدات PHP التي يُسمح بفتح الـ controllers منها. |
| `exclude_paths` | `resources/views/vendor` | مسارات Blade المستبعدة. |
| `token_ttl_seconds` | `300` | مدة صلاحية الـ token بالثواني. |

## Docker والبيئات البعيدة

```php
'path_mapping' => ['/var/www/html' => '/Users/me/project'],
```

## المحررات

يستخدم VS Code وCursor بروتوكولي `vscode://file` و`cursor://file`، ويستخدم PhpStorm بروتوكول `phpstorm://open`. سجّل JetBrains URL handler إذا ظهرت رسالة بروتوكول غير مسجل.

## النماذج (Forms)

مدعوم: الـ actions النسبية والمطلقة من نفس الـ origin، وGET/POST، و`_method` spoofing، و`formaction`/`formmethod` في زر الإرسال. غير مدعوم: وجهات JavaScript الديناميكية والـ origins الخارجية.

## القيود

يعلّم LaraSelector وسوم HTML الثابتة. يتجاهل الوسوم غير الصحيحة، والوسوم الديناميكية التي تحتوي تعبيرات Blade، ووسوم استدعاء الـ components، وShadow DOM، والـ iframes من origin آخر. التنقل لإجراءات Livewire غير متاح حاليًا.
