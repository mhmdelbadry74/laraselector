---
layout: home
hero:
  name: LaraSelector
  text: Click in the browser. Land in your code.
  tagline: Maps any element on your local Laravel page to its Blade file, page controller or form action, and opens it in your editor.
  image: {src: /logo.svg, alt: LaraSelector}
  actions:
    - {theme: brand, text: Get started, link: /guide/getting-started}
    - {theme: alt, text: GitHub, link: https://github.com/mhmdelbadry74/laraselector}
features:
  - {icon: 🎯, title: Blade to editor, details: Land on the exact Blade line through layouts, includes, loops and components.}
  - {icon: 🧭, title: Controllers too, details: Open the page controller or a form's action controller, including invokable controllers and closures.}
  - {icon: 🔒, title: Safe by design, details: Development only. Production is always denied and routes are never executed.}
  - {icon: ⌨️, title: Your editor, details: VS Code, Cursor and PhpStorm, with path mapping for Docker.}
---

![Animated illustration: hover an element in the browser, its Blade file opens in the editor](/demo.svg)

<p class="demo-cap">Illustration of the flow</p>

## How it works

<div class="steps3">
<div><b>1</b><h3>Mark</h3><p>While Blade compiles, static HTML tags get a tiny source token pointing to the file and line. Nothing is stored in your views.</p></div>
<div><b>2</b><h3>Select</h3><p>In Chrome, click <em>Start selecting</em>, hover and click an element. The extension reads its token.</p></div>
<div><b>3</b><h3>Open</h3><p>The package resolves the token, the page controller and the form action, and your editor opens at the exact line.</p></div>
</div>

## Set up in a minute

::: code-group
```sh [1. Install]
composer require --dev mhmdelbadry74/laraselector-laravel
php artisan vendor:publish --tag=laraselector-config
```
```dotenv [2. .env]
LARASELECTOR_ENABLED=true
LARASELECTOR_EDITOR=vscode   # vscode | cursor | phpstorm
```
```sh [3. Clear views]
php artisan view:clear
```
:::

Then load the Chrome extension and start selecting. The [full guide](/guide/getting-started) covers every step.

## What it can open

| You click | LaraSelector opens |
| --- | --- |
| Any element | The Blade file and line, through layouts, includes, loops, conditionals, components and slots |
| Anywhere on the page | The controller method that renders the page, including invokable controllers, inherited methods and closures |
| A form or submit button | The controller behind its action, with GET/POST, `_method` spoofing and `formaction` |

## Works with

<div class="chips"><span>Laravel 10</span><span>Laravel 11</span><span>Laravel 12</span><span>PHP 8.1+</span><span>VS Code</span><span>Cursor</span><span>PhpStorm</span><span>Chrome</span><span>Docker</span></div>

## Built to be safe

<div class="cards2">
<div><b>Development only</b><p>Allowed only in <code>local</code> and <code>dev</code>. Production is always denied.</p></div>
<div><b>Nothing is executed</b><p>Routes are matched against a synthetic request and never dispatched.</p></div>
<div><b>Locked down</b><p>Same-origin checks, a session token, and real-path validation inside an allowlist.</p></div>
<div><b>Local-only</b><p>No data leaves your machine. See the <a href="https://github.com/mhmdelbadry74/laraselector/blob/main/PRIVACY.md">privacy policy</a>.</p></div>
</div>

## FAQ

**Does it slow down my app?** It only runs in development, and activation is checked at render time.

**Will it leak into production?** No. Production is always denied, and cached views stop emitting attributes once it is disabled.

**Does it work in Docker?** Yes, set `path_mapping` to translate container paths to your local paths.

**Livewire?** Supported: open the component class, its `render()`, the action under the cursor, and inspect its public properties.

<div class="cta-end"><h2>Ready to try it?</h2><p>Install the package and jump from any element to your code.</p><a class="cta-btn" href="/laraselector/guide/getting-started">Get started</a></div>
