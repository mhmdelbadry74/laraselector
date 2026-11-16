# إضافة Chrome

تتواصل الإضافة مع الـ package الشغال في تطبيق Laravel المحلي. ثبّت الاثنين معًا.

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/releases/latest/download/laraselector-chrome.zip">⬇ نزّل الإضافة (.zip)</a>

الرابط دائمًا لأحدث نسخة. النسخ القديمة في [صفحة Releases](https://github.com/mhmdelbadry74/laraselector/releases).

## التثبيت في Chrome

1. **نزّل** ملف ZIP أعلاه و**فك ضغطه**. احتفظ بالمجلد الناتج في مكان ثابت، لأن Chrome يحمّل الإضافة منه.
2. افتح `chrome://extensions` في شريط العنوان.
3. فعّل **Developer mode** (المفتاح في أعلى الصفحة).
4. اضغط **Load unpacked** واختر **المجلد الذي فككته** (الذي يحتوي على `manifest.json`).
5. اضغط أيقونة الأحجية في شريط الأدوات و**ثبّت** LaraSelector.

تعمل أيضًا على متصفحات Chromium الأخرى (Edge وBrave وArc) من صفحة `://extensions` الخاصة بها.

## الاستخدام

1. افتح صفحة Laravel المحلية (يجب أن يكون الـ package [مفعّلًا](/ar/guide/getting-started)).
2. اضغط أيقونة LaraSelector ثم **Start selecting**.
3. مرّر على أي عنصر واضغط عليه، ثم اختر Blade أو controller الصفحة أو form action.
4. اضغط **Escape** للإيقاف.

## الصلاحيات

فقط `activeTab` و`scripting` و`storage`. تعمل بعد تفاعلك مع النافذة المنبثقة، وتتواصل فقط مع مسارات `__laraselector` في نفس الـ origin للصفحة الحالية.

## التحديث

نزّل ملف ZIP الجديد، واستبدل محتويات المجلد، ثم اضغط أيقونة إعادة التحميل على بطاقة الإضافة في `chrome://extensions`.

::: tip لا يظهر زر Load unpacked؟
تأكد من تفعيل **Developer mode**. وإذا ظهر خطأ في الـ manifest فغالبًا اخترت ملف ZIP أو مجلدًا أعلى؛ اختر المجلد الذي يحتوي مباشرة على `manifest.json`.
:::
