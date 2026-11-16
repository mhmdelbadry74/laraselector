# المميزات

اضغط **Start selecting** ثم اضغط على أي عنصر وستفتح لوحة بكل ما تعرفه LaraSelector عنه. حدّث الـ package ونفّذ `php artisan view:clear` مرة واحدة لتفعيل التفاصيل.

## الفحص

- **Data**: المتغيرات الممررة للـ view التي رسمت العنصر. المفاتيح مثل `password` و`token` و`secret` و`api_key` تُخفى.
- **Stack**: ترتيب الـ render مع الوقت الكلي والذاتي (الـ layout يُرسم داخل الصفحة التي تعمل `@extends` له).
- **Queries**: الاستعلامات التي نُفذت أثناء رسم الـ view. نفس الـ SQL مكرر 3 مرات أو أكثر يظهر كتحذير N+1 محتمل.
- **Route**: الاسم والـ methods والـ middleware والـ action والـ parameters، وللنماذج الـ `FormRequest` وقواعده.
- **Livewire / Alpine**: الـ class والـ `render()` والـ action تحت المؤشر والـ properties العامة و`x-data`.
- **Inertia**: اسم الصفحة والـ props من *Page info*، ويفتح ملف Vue/React/Svelte.
- **الترجمة**: اضغط على نص لتجد مفتاحه في ملفات `lang` بكل اللغات.
- **CSS**: أي ملف stylesheet في مشروعك يعرّف كل class، مع تمييز classes الـ Tailwind.

## أدوات الصفحة (من نافذة الإضافة)

- **Page info**: الـ route وعدد الـ renders والاستعلامات وتحذيرات N+1 وصفحة Inertia.
- **Heatmap**: يحيط كل partial بإطار ملون من الأخضر للأحمر حسب وقت رسمه.

## التعديل داخل الصفحة

متوقف افتراضيًا. ضع `LARASELECTOR_EDITING=true` ثم عدّل القيمة في تبويب **Text** أو **CSS**، شاهد المعاينة، واضغط **Save to source**. لا يكتب شيئًا إذا كان النص مكررًا بجوار العنصر أو آتيًا من متغير، وكل حفظ يعطيك **Undo** يعمل طالما لم يتغير الملف بعده.

## تقارير الأخطاء

من تبويب **Report** تنسخ أو تنزّل لقطة للعنصر، وتنسخ وصفًا بصيغة Markdown (GitHub/GitLab) أو Jira يحتوي الصفحة والـ selector وملف Blade وسطره والـ controller والـ route والـ stack وبيانات الـ view.

## اختيار عدة عناصر

**Shift+click** يضيف عناصر لاختيار مرقّم. **Open all** يفتح كل الملفات في المحرر، و**Compare 2** يقارن بين عنصرين، ويمكنك تثبيت عنصر ومقارنته بآخر في صفحة أخرى.

## Docker وSail وWSL

روابط المحرر تحتاج مسار المشروع على جهازك: استخدم `path_mapping` أو اكتب المسار في خانة **Project path on this machine** في نافذة الإضافة.
