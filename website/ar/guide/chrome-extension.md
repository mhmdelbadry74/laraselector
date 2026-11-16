# إضافة Chrome

تتواصل الإضافة مع الـ package الشغال في تطبيق Laravel المحلي. ثبّت الاثنين معًا.

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-chrome.zip">⬇ نزّل الإضافة (.zip)</a>

الرابط دائمًا لأحدث نسخة. النسخ القديمة في [صفحة Releases](https://github.com/mhmdelbadry74/laraselector/releases).

## التثبيت في Chrome

1. **نزّل** ملف ZIP أعلاه و**فك ضغطه**. احتفظ بالمجلد الناتج في مكان ثابت، لأن Chrome يحمّل الإضافة منه.
2. افتح `chrome://extensions` في شريط العنوان.
3. فعّل **Developer mode** (المفتاح في أعلى الصفحة).
4. اضغط **Load unpacked** واختر **المجلد الذي فككته** (الذي يحتوي على `manifest.json`).
5. اضغط أيقونة الأحجية في شريط الأدوات و**ثبّت** LaraSelector.

تعمل أيضًا على متصفحات Chromium الأخرى (Edge وBrave وArc) من صفحة `://extensions` الخاصة بها.

## Firefox

::: warning تجريبي
نسخة Firefox جديدة ولم تمر على مراجعة المتجر بعد. يحتفظ Firefox بالإضافات غير الموقّعة فقط حتى تعيد تشغيله.
:::

<a class="dl-btn" href="https://github.com/mhmdelbadry74/laraselector/raw/main/apps/chrome-extension/laraselector-firefox.zip">⬇ نزّل نسخة Firefox (.zip)</a>

1. نزّل ملف ZIP (لا حاجة لفك ضغطه).
2. افتح `about:debugging#/runtime/this-firefox`.
3. اضغط **Load Temporary Add-on…** واختر ملف ZIP (أو ملف `manifest.json`).
4. استخدمها كما في Chrome. تتطلب Firefox 140 أو أحدث.

تُزال الإضافة عند إعادة تشغيل Firefox. ستتوفر نسخة موقّعة ودائمة بعد نشرها على Firefox Add-ons.

## الاستخدام

1. افتح صفحة Laravel المحلية (يجب أن يكون الـ package [مفعّلًا](/ar/guide/getting-started)).
2. اضغط أيقونة LaraSelector ثم **Start selecting**.
3. مرّر على أي عنصر واضغط عليه لتفتح لوحة التفاصيل ([المميزات](/ar/guide/features)). **Shift+click** يختار عدة عناصر.
4. **Page info** و**Heatmap** في النافذة المنبثقة يعرضان بيانات الصفحة وأوقات الـ render.
5. اضغط **Escape** لإغلاق اللوحة أو الإيقاف.

تستخدم Docker أو Sail أو WSL؟ اكتب مسار مشروعك في خانة **Project path on this machine** حتى تفتح روابط المحرر على جهازك.

## الصلاحيات

فقط `activeTab` و`scripting` و`storage`. لقطات الشاشة تستخدم `activeTab` وتبقى على جهازك. تعمل بعد تفاعلك مع النافذة المنبثقة، وتتواصل فقط مع مسارات `__laraselector` في نفس الـ origin للصفحة الحالية.

## التحديث

نزّل ملف ZIP الجديد، واستبدل محتويات المجلد، ثم اضغط أيقونة إعادة التحميل على بطاقة الإضافة في `chrome://extensions`.

::: tip لا يظهر زر Load unpacked؟
تأكد من تفعيل **Developer mode**. وإذا ظهر خطأ في الـ manifest فغالبًا اخترت ملف ZIP أو مجلدًا أعلى؛ اختر المجلد الذي يحتوي مباشرة على `manifest.json`.
:::
