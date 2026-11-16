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

```sh
composer require --dev mhmdelbadry74/laraselector-laravel
```
