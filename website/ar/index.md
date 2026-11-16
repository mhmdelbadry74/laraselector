---
layout: home
hero:
  name: LaraSelector
  text: اضغط في المتصفح. وصل لكودك مباشرة.
  tagline: يربط أي عنصر في صفحة Laravel المحلية بملف Blade أو الـ controller أو الـ form action المسؤول عنه، ويفتحه في محررك.
  image: {src: /logo.svg, alt: LaraSelector}
  actions:
    - {theme: brand, text: ابدأ الآن, link: /ar/guide/getting-started}
    - {theme: alt, text: GitHub, link: https://github.com/mhmdelbadry74/laraselector}
features:
  - {icon: 🎯, title: من Blade إلى المحرر, details: تصل إلى سطر Blade المقصود حتى عبر الـ layouts والـ includes والحلقات والـ components.}
  - {icon: 🧭, title: وللـ Controllers أيضًا, details: افتح الـ controller الخاص بالصفحة أو بالـ form action، سواء كان invokable أو closure.}
  - {icon: 🔒, title: آمن بطبيعته, details: للتطوير فقط. بيئة production مرفوضة دائمًا ولا يتم تنفيذ أي route.}
  - {icon: ⌨️, title: محررك المفضل, details: يدعم VS Code وCursor وPhpStorm، مع ربط المسارات لـ Docker.}
---

![رسم توضيحي متحرك: مرّر على عنصر في المتصفح فيفتح ملف Blade الخاص به في المحرر](/demo.svg)

<p class="demo-cap">رسم توضيحي لطريقة العمل</p>

## كيف يعمل

<div class="steps3">
<div><b>1</b><h3>التعليم</h3><p>أثناء ترجمة Blade، تحصل وسوم HTML الثابتة على token صغير يشير إلى الملف والسطر. لا يتم تخزين أي شيء داخل الـ views.</p></div>
<div><b>2</b><h3>التحديد</h3><p>في Chrome اضغط <em>Start selecting</em> ثم مرّر على عنصر واضغط عليه. تقرأ الإضافة الـ token الخاص به.</p></div>
<div><b>3</b><h3>الفتح</h3><p>يحدد الـ package مصدر الـ token والـ controller الخاص بالصفحة والـ form action، ثم يفتح محررك عند السطر المقصود.</p></div>
</div>

## جهّزه في دقيقة

::: code-group
```sh [1. التثبيت]
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```
```dotenv [2. ملف .env]
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
```
```sh [3. مسح الـ views]
php artisan view:clear
```
:::

ثم ثبّت إضافة Chrome وابدأ التحديد. يشرح [الدليل الكامل](/ar/guide/getting-started) كل خطوة.

## ما الذي يمكنه فتحه

| عند الضغط على | يفتح LaraSelector |
| --- | --- |
| أي عنصر | ملف Blade والسطر، عبر الـ layouts والـ includes والحلقات والشروط والـ components والـ slots |
| أي مكان في الصفحة | دالة الـ controller التي تعرض الصفحة، بما فيها الـ invokable والموروثة والـ closures |
| نموذج أو زر إرسال | الـ controller الخاص بالـ action، مع GET/POST و`_method` spoofing و`formaction` |

## متوافق مع

<div class="chips"><span>Laravel 10</span><span>Laravel 11</span><span>Laravel 12</span><span>PHP 8.1+</span><span>VS Code</span><span>Cursor</span><span>PhpStorm</span><span>Chrome</span><span>Docker</span></div>

## مبني ليكون آمنًا

<div class="cards2">
<div><b>للتطوير فقط</b><p>يعمل فقط في بيئتي <code>local</code> و<code>dev</code>. بيئة production مرفوضة دائمًا.</p></div>
<div><b>لا شيء يُنفَّذ</b><p>تتم مطابقة الـ routes على طلب افتراضي ولا يتم تنفيذها أبدًا.</p></div>
<div><b>محكم الحماية</b><p>فحص same-origin وsession token والتحقق من المسارات الحقيقية داخل قائمة مسموحة.</p></div>
<div><b>محلي بالكامل</b><p>لا تغادر أي بيانات جهازك. راجع <a href="https://github.com/mhmdelbadry74/laraselector/blob/main/PRIVACY.md">سياسة الخصوصية</a>.</p></div>
</div>

## أسئلة شائعة

**هل يبطّئ تطبيقي؟** يعمل في التطوير فقط، ويتم فحص التفعيل وقت العرض.

**هل قد يظهر في production؟** لا. بيئة production مرفوضة دائمًا، وتتوقف الـ views المخزنة عن إخراج الـ attributes بمجرد التعطيل.

**هل يعمل مع Docker؟** نعم، اضبط `path_mapping` لتحويل مسارات الحاوية إلى مسارات جهازك.

**وماذا عن Livewire؟** مدعوم: افتح الـ class و`render()` والـ action تحت المؤشر، واطّلع على الـ properties العامة.

<div class="cta-end"><h2>جاهز للتجربة؟</h2><p>ثبّت الـ package وانتقل من أي عنصر إلى كودك.</p><a class="cta-btn" href="/laraselector/ar/guide/getting-started">ابدأ الآن</a></div>
