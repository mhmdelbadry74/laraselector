(() => {
  if (window.__laraselectorLoaded) return;
  window.__laraselectorLoaded = true;

  // ───────────────────────── state ─────────────────────────
  let active = false, token = null, caps = null, panel = null, heatOn = false, heatTimer = null;
  let current = null;                 // {el, id, resolved, inspect, error}
  const selection = [];               // multi-select: {el, id, resolved}
  const resolveCache = new Map();
  const SECRET = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|csrf|private|credential|otp/i;

  // ───────────────────────── shadow UI ─────────────────────────
  const root = document.createElement('div');
  root.id = '__laraselector_root';
  const shadow = root.attachShadow({mode: 'closed'});
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}
    .box{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #5b4bff;background:#5b4bff20}
    .tip{position:fixed;z-index:2147483646;pointer-events:none;background:#141222;color:#fff;padding:6px 8px;border-radius:6px;font:12px ui-monospace,monospace;max-width:420px}
    .badge{position:fixed;z-index:2147483646;pointer-events:none;border:2px dashed #ffb454;background:#ffb45418}
    .badge b{position:absolute;top:-10px;left:-10px;background:#ffb454;color:#141222;border-radius:50%;width:20px;height:20px;display:grid;place-items:center;font:700 11px system-ui}
    .heat{position:absolute;z-index:2147483645;pointer-events:none;border:2px solid;border-radius:3px}
    .heat span{position:absolute;top:0;left:0;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#fff;font:600 10px ui-monospace,monospace;padding:1px 4px;border-bottom-right-radius:4px}
    .panel{position:fixed;z-index:2147483647;top:0;right:0;width:460px;max-width:100vw;height:100vh;display:flex;flex-direction:column;background:#141222;color:#f5f4ff;font:12px/1.45 system-ui,sans-serif;box-shadow:-10px 0 30px #0009}
    .head{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #2c2850}
    .head strong{flex:1;font:600 12px ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;border-bottom:1px solid #2c2850}
    .tab,.act{font:inherit;color:#fff;background:#302b52;border:0;border-radius:5px;padding:5px 9px;cursor:pointer}
    .tab[aria-selected=true],.act.primary{background:#7868ff}
    .act:hover,.tab:hover{filter:brightness(1.2)}
    .act.small{padding:2px 6px;font-size:11px}
    .act:disabled{opacity:.45;cursor:default}
    .body{flex:1;overflow:auto;padding:10px 12px}
    h4{margin:12px 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#9a96bd}
    h4:first-child{margin-top:0}
    .row{display:flex;gap:6px;align-items:center;margin:4px 0}
    .row .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    code,pre,textarea,input{font:11px ui-monospace,monospace}
    pre{margin:4px 0;padding:8px;background:#0d0b1a;border-radius:6px;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto}
    textarea,input{width:100%;background:#0d0b1a;color:#fff;border:1px solid #3a3566;border-radius:5px;padding:6px}
    textarea{min-height:64px;resize:vertical}
    .mut{color:#9a96bd}.warn{color:#ffb454}.bad{color:#ff7b7b}.ok{color:#7ee787}
    .card{background:#1b1833;border-radius:8px;padding:8px 10px;margin:6px 0}
    .pill{display:inline-block;background:#302b52;border-radius:99px;padding:1px 7px;margin:1px 2px 1px 0;font:11px ui-monospace,monospace}
    .pill.util{background:#23324a}.pill.def{background:#3b2f6b}
    details{margin-left:10px}summary{cursor:pointer;margin-left:-10px}
    .k{color:#a8a0ff}.s{color:#9ee493}.n{color:#ffb454}
    table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2c2850;padding:4px 6px;text-align:left;vertical-align:top;word-break:break-word}
    th{color:#9a96bd;font-weight:600}.diff{background:#4b2d00}
    .bar{height:6px;border-radius:3px;background:#7868ff;margin-top:2px}
    .toast{position:fixed;z-index:2147483647;left:50%;bottom:20px;transform:translateX(-50%);background:#302b52;color:#fff;padding:8px 14px;border-radius:8px;font:12px system-ui}
  `;
  const box = h('div', {class: 'box', hidden: true});
  const tip = h('div', {class: 'tip', hidden: true});
  const overlay = h('div', {});       // selection badges + heatmap
  shadow.append(style, box, tip, overlay);
  document.documentElement.append(root);

  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }

  // ───────────────────────── API ─────────────────────────
  const api = (path) => `${location.origin}/__laraselector/${path}`;
  const marker = (e) => e?.closest?.('[data-laraselector]');
  const requestId = () => document.querySelector('meta[name="laraselector-request"]')?.content || undefined;

  async function handshake(force) {
    if (token && !force) return token;
    const r = await fetch(api('handshake'), {method: 'POST', credentials: 'same-origin', headers: {'X-Requested-With': 'LaraSelector'}});
    if (!r.ok) throw Error('Local API unavailable');
    token = r.headers.get('X-LaraSelector-Token');
    return token;
  }

  async function hostRoot() {
    try { const k = 'hostRoot:' + location.origin; return (await chrome.storage.local.get(k))[k] || undefined; } catch { return undefined; }
  }

  async function call(path, body = {}) {
    await handshake();
    const send = async () => {
      const r = await fetch(api(path), {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-LaraSelector-Token': token},
        body: JSON.stringify({...body, request: requestId(), host_root: await hostRoot()}),
      });
      return [r, await r.json().catch(() => ({}))];
    };
    let [r, j] = await send();
    if (r.status === 403 && j.error?.code === 'access_denied') { await handshake(true); [r, j] = await send(); }
    if (!r.ok) { const e = Error(j.error?.message || `Request failed (${r.status})`); e.code = j.error?.code; throw e; }
    return j;
  }

  async function loadCaps() {
    if (caps) return caps;
    try { const r = await fetch(api('capabilities'), {credentials: 'same-origin'}); caps = r.ok ? await r.json() : {protocol: 0}; } catch { caps = {protocol: 0}; }
    return caps;
  }

  // ───────────────────────── element helpers ─────────────────────────
  function livewireInfo(el) {
    const host = el.closest?.('[wire\\:id]'); if (!host) return null;
    let component = null, data = null;
    try {
      const snap = host.getAttribute('wire:snapshot');
      if (snap) { const s = JSON.parse(snap); component = s?.memo?.name; data = unwrapLivewire(s?.data); }
      else { const s = JSON.parse(host.getAttribute('wire:initial-data') || 'null'); component = s?.fingerprint?.name; data = s?.serverMemo?.data; }
    } catch {}
    if (!component) return null;
    let action = null;
    for (let n = el; n && n !== host.parentElement && !action; n = n.parentElement) {
      for (const a of n.attributes || []) {
        if (/^wire:(click|submit|change|keydown|keyup|blur|focus|init|poll|intersect)/.test(a.name)) {
          const m = a.value.trim().match(/^([A-Za-z_]\w*)\s*(\(|$)/); if (m) { action = m[1]; break; }
        }
      }
    }
    return {component, action, data};
  }
  function unwrapLivewire(v) {   // Livewire 3 wraps arrays/objects as [value, {s: 'arr'}]
    if (Array.isArray(v) && v.length === 2 && v[1] && typeof v[1] === 'object' && !Array.isArray(v[1]) && 's' in v[1]) return unwrapLivewire(v[0]);
    if (Array.isArray(v)) return v.map(unwrapLivewire);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrapLivewire(x)]));
    return v;
  }
  function alpineInfo(el) { const n = el.closest?.('[x-data]'); return n ? (n.getAttribute('x-data') || '{}').slice(0, 600) : null; }
  function formInfo(el) {
    if (el.closest?.('form[wire\\:submit],form[wire\\:submit\\.prevent]')) return null;
    const control = el.closest?.('button,input[type=submit],input[type=image]');
    const form = control?.form || el.closest?.('form'); if (!form) return null;
    const attr = (n) => control?.getAttribute(n) ?? form.getAttribute(n);
    const action = attr('formaction') ?? form.getAttribute('action') ?? location.href;
    const method = (attr('formmethod') ?? form.getAttribute('method') ?? 'get').toUpperCase();
    const spoof = new FormData(form).get('_method');
    return {url: new URL(action, location.href).href, method: spoof ? String(spoof).toUpperCase() : method};
  }
  function ownText(el) {
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim());
    const node = nodes.sort((a, b) => b.nodeValue.trim().length - a.nodeValue.trim().length)[0] || null;
    return {node, text: node ? node.nodeValue.trim().slice(0, 300) : ''};
  }
  function cssPath(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 5 && n !== document.body; n = n.parentElement) {
      let part = n.localName;
      if (n.id) { parts.unshift(`${part}#${CSS.escape(n.id)}`); break; }
      const cls = [...n.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
      const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.localName === n.localName) : [];
      part += cls + (same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : '');
      parts.unshift(part);
    }
    return parts.join(' > ');
  }
  function tokenPath(el) {
    try { const p = el.dataset.laraselector.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(p + '='.repeat((4 - p.length % 4) % 4))).p; } catch { return null; }
  }
  function redact(v, depth = 0) {
    if (Array.isArray(v)) return depth > 5 ? '…' : v.map((x) => redact(x, depth + 1));
    if (v && typeof v === 'object') return depth > 5 ? '…' : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '••• redacted' : redact(x, depth + 1)]));
    return v;
  }

  async function resolve(el) {
    const id = el.dataset.laraselector;
    if (resolveCache.has(id) && !formInfo(el) && !livewireInfo(el)) return resolveCache.get(id);
    const r = await call('resolve', {id, page: location.href, form: formInfo(el), livewire: livewireInfo(el)});
    resolveCache.set(id, r);
    return r;
  }

  // ───────────────────────── selection mode ─────────────────────────
  const inPanel = (e) => e.composedPath?.().includes(root);
  const clearHover = () => { box.hidden = tip.hidden = true; };

  async function move(e) {
    if (inPanel(e)) return;
    const el = marker(e.target); if (!el) { clearHover(); return; }
    const r = el.getBoundingClientRect();
    box.hidden = false;
    Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
    try {
      const s = await resolve(el);
      tip.textContent = `${s.source.path}:${s.source.line}${selection.length || e.shiftKey ? '   (Shift+click: add to selection)' : ''}`;
    } catch (err) { tip.textContent = err.message; }
    tip.hidden = false;
    Object.assign(tip.style, {left: Math.max(8, r.left) + 'px', top: Math.max(8, r.top - 30) + 'px'});
  }

  async function click(e) {
    if (inPanel(e)) return;
    const el = marker(e.target); if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.shiftKey) return toggleSelected(el);
    await showElement(el);
  }
  const noShiftSelect = (e) => { if (e.shiftKey && !inPanel(e) && marker(e.target)) e.preventDefault(); };
  function key(e) { if (e.key === 'Escape') { e.preventDefault(); if (panel) closePanel(); else stop('Selection stopped'); } }

  function stop(message) {
    active = false; clearHover();
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('mousedown', noShiftSelect, true);
    document.removeEventListener('keydown', key, true);
    chrome.runtime.sendMessage({type: 'state', active: false, message}).catch(() => {});
  }
  async function start() {
    try {
      await handshake(); await loadCaps(); active = true;
      document.addEventListener('pointermove', move, true);
      document.addEventListener('click', click, true);
      document.addEventListener('mousedown', noShiftSelect, true);
      document.addEventListener('keydown', key, true);
      chrome.runtime.sendMessage({type: 'state', active: true, message: 'Select an element'}).catch(() => {});
    } catch (e) { stop(e.message); }
  }

  // ───────────────────────── multi-select ─────────────────────────
  async function toggleSelected(el) {
    const i = selection.findIndex((s) => s.el === el);
    if (i >= 0) selection.splice(i, 1);
    else { try { selection.push({el, id: el.dataset.laraselector, resolved: await resolve(el)}); } catch (e) { return toast(e.message); } }
    drawBadges();
    if (panel?.kind === 'element' && current?.resolved) buildElementPanel(current); else showSelectionPanel();
  }
  function drawBadges() {
    overlay.querySelectorAll('.badge').forEach((n) => n.remove());
    selection.forEach((s, i) => {
      const r = s.el.getBoundingClientRect();
      overlay.append(h('div', {class: 'badge', style: `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`}, h('b', {}, i + 1)));
    });
  }
  addEventListener('scroll', () => selection.length && drawBadges(), true);
  addEventListener('resize', () => { selection.length && drawBadges(); heatOn && drawHeat(); });

  async function openAll() {
    const uris = [...new Set(selection.map((s) => s.resolved.editorUri))];
    for (const uri of uris) { h('a', {href: uri}).click(); await new Promise((r) => setTimeout(r, 700)); }
    toast(`Opened ${uris.length} file${uris.length === 1 ? '' : 's'}`);
  }

  // ───────────────────────── panel framework ─────────────────────────
  // panel = {title, tabs:[{id,label,render}], tab}
  function openPanel(spec) { panel?.node?.remove(); panel = {...spec, tab: spec.tab || spec.tabs[0].id}; renderPanel(); }
  function closePanel() { panel?.node?.remove(); panel = null; }
  function renderPanel() {
    if (!panel) return;
    panel.node?.remove();
    const body = h('div', {class: 'body'});
    const tabs = panel.tabs.map((t) => h('button', {class: 'tab', role: 'tab', 'aria-selected': t.id === panel.tab, onclick: () => { panel.tab = t.id; renderPanel(); }}, t.label));
    panel.node = h('div', {class: 'panel'},
      h('div', {class: 'head'}, h('strong', {title: panel.title}, panel.title), h('button', {class: 'act small', title: 'Close (Esc)', onclick: closePanel}, '✕')),
      h('div', {class: 'tabs', role: 'tablist'}, tabs), body);
    panel.node.addEventListener('keydown', (e) => e.stopPropagation());
    panel.node.addEventListener('keyup', (e) => e.stopPropagation());
    shadow.append(panel.node);
    const t = panel.tabs.find((x) => x.id === panel.tab) || panel.tabs[0];
    try { [t.render()].flat(Infinity).forEach((n) => n && body.append(n.nodeType ? n : document.createTextNode(String(n)))); } catch (e) { body.append(h('div', {class: 'bad'}, e.message)); }
  }

  function toast(text) { const t = h('div', {class: 'toast'}, text); shadow.append(t); setTimeout(() => t.remove(), 2400); }
  async function copy(text, label = 'Copied') { try { await navigator.clipboard.writeText(text); toast(label); } catch { toast('Copy failed'); } }
  const openUri = (uri, label) => { location.href = uri; toast(label ? 'Opening ' + label : 'Opening editor'); };

  // reusable renderers
  function fileRow(target, label) {
    return h('div', {class: 'row'},
      h('button', {class: 'act primary', onclick: () => openUri(target.editorUri, `${target.source.path}:${target.source.line}`)}, label || 'Open'),
      h('span', {class: 'grow', title: `${target.source.path}:${target.source.line}`}, `${target.source.path}:${target.source.line}`),
      h('button', {class: 'act small', title: 'Copy path', onclick: () => copy(`${target.source.path}:${target.source.line}`)}, '⧉'));
  }
  function tree(value, name, depth = 0) {
    const label = name == null ? [] : [h('span', {class: 'k'}, String(name)), ': '];
    if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      const head = (Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`) + (value._class ? ' ' + value._class.split('\\').pop() : '');
      const d = h('details', {}, h('summary', {}, label, h('span', {class: 'mut'}, head)));
      if (depth < 1) d.open = true;
      entries.forEach(([k, v]) => d.append(tree(v, k, depth + 1)));
      return d;
    }
    const cls = typeof value === 'string' ? 's' : typeof value === 'number' ? 'n' : 'mut';
    return h('div', {style: 'margin-left:10px;word-break:break-word'}, label, h('span', {class: cls}, typeof value === 'string' ? JSON.stringify(value) : String(value)));
  }
  const ms = (v) => `${v} ms`;
  const section = (title, ...kids) => [h('h4', {}, title), ...kids];
  const note = (text, cls = 'mut') => h('div', {class: cls, style: 'margin:6px 0'}, text);

  // ───────────────────────── element panel ─────────────────────────
  async function showElement(el) {
    current = {el, id: el.dataset.laraselector, resolved: null, inspect: null, error: null};
    const mine = current;
    openPanel({kind: 'element', title: 'Loading…', tabs: [{id: 'open', label: 'Open', render: () => note('Loading source info…')}]});
    await loadCaps();
    try { mine.resolved = await resolve(el); } catch (e) { mine.error = e; }
    if (current !== mine) return;
    if (mine.resolved) {
      const text = ownText(el).text;
      try {
        mine.inspect = await call('inspect', {id: mine.id, page: location.href, form: formInfo(el), livewire: livewireInfo(el), text, classes: [...el.classList], tag: el.localName});
      } catch (e) { mine.inspectError = e; }
    }
    if (current !== mine) return;
    buildElementPanel(mine);
  }

  function buildElementPanel(c) {
    const el = c.el, r = c.resolved, ins = c.inspect;
    const lw = livewireInfo(el), alpine = alpineInfo(el), text = ownText(el);
    const tabs = [{id: 'open', label: 'Open', render: () => openTab(c)}];
    if (ins?.view) tabs.push({id: 'data', label: 'Data', render: () => dataTab(ins)}, {id: 'stack', label: 'Stack', render: () => stackTab(ins)}, {id: 'queries', label: `Queries${ins.nplus1?.length ? ' ⚠' : ''}`, render: () => queriesTab(ins)});
    if (ins?.route || ins?.formRoute) tabs.push({id: 'route', label: 'Route', render: () => routeTab(ins)});
    if (text.text) tabs.push({id: 'text', label: 'Text', render: () => textTab(c, text)});
    if (el.classList.length) tabs.push({id: 'css', label: 'CSS', render: () => cssTab(c)});
    if (lw || alpine) tabs.push({id: 'live', label: lw ? 'Livewire' : 'Alpine', render: () => liveTab(c, lw, alpine)});
    tabs.push({id: 'report', label: 'Report', render: () => reportTab(c)}, {id: 'compare', label: 'Compare', render: () => compareTab(c)});
    if (selection.length) tabs.push({id: 'selection', label: `Selection (${selection.length})`, render: selectionTab});
    openPanel({kind: 'element', title: c.error ? 'Error' : `${r.source.path}:${r.source.line}`, tabs, tab: panel?.tab !== 'open' && tabs.some((t) => t.id === panel?.tab) ? panel.tab : 'open'});
  }

  function openTab(c) {
    if (c.error) return note(c.error.message, 'bad');
    const labels = {blade: 'Blade', pageController: 'Page controller', formAction: 'Form action', livewireAction: 'Livewire action', livewireComponent: 'Livewire component', livewireRender: 'Livewire render()'};
    const out = [h('h4', {}, 'Open in editor')];
    Object.entries(c.resolved.targets || {}).forEach(([k, t]) => out.push(h('div', {class: 'mut'}, labels[k] || k), fileRow(t)));
    if (c.inspectError) out.push(note(c.inspectError.code ? c.inspectError.message : 'Details need LaraSelector package 0.2+ (composer update mhmdelbadry74/laraselector-laravel, then php artisan view:clear).', 'warn'));
    else if (!c.inspect?.view) out.push(note('No render data for this request. Reload the page after updating the package and running php artisan view:clear.', 'warn'));
    if (c.inspect?.nplus1?.length) out.push(note(`⚠ ${c.inspect.nplus1.length} repeated query pattern(s) in this view (possible N+1). See Queries.`, 'warn'));
    if (caps?.container) out.push(note('Running in a container: if editor links do not open, set “Project path on this machine” in the extension popup.', 'warn'));
    out.push(h('h4', {}, 'Selection'), h('div', {class: 'row'},
      h('button', {class: 'act', onclick: () => toggleSelected(c.el)}, selection.some((s) => s.el === c.el) ? 'Remove from selection' : 'Add to selection'),
      h('span', {class: 'mut'}, 'or Shift+click')));
    return out;
  }

  function dataTab(ins) {
    const v = ins.view, out = [];
    out.push(h('div', {class: 'mut'}, `${v.path} · rendered ${v.count}× · ${ms(v.ms)} total, ${ms(v.self)} self`));
    v.renders.forEach((r, i) => {
      out.push(h('h4', {}, v.renders.length > 1 ? `Render ${i + 1} of ${v.count}` : 'Variables'));
      out.push(Object.keys(r.data).length ? tree(r.data) : note('No variables.'));
    });
    if (v.count > v.renders.length) out.push(note(`…and ${v.count - v.renders.length} more renders (only the first ${v.renders.length} kept).`));
    return out;
  }

  function stackTab(ins) {
    const chain = ins.view.chain;
    return [h('h4', {}, 'Render stack (outermost first)'), note('A layout renders inside the page that @extends it, so it appears after it here.'),
      ...chain.map((n, i) => h('div', {class: 'card', style: `margin-left:${i * 12}px`},
        h('div', {}, n.path), h('div', {class: 'mut'}, `${ms(n.ms)} total · ${ms(n.self)} self`), n.source ? fileRow(n) : null))];
  }

  function queriesTab(ins) {
    const v = ins.view, qs = v.renders.flatMap((r) => r.queries), out = [];
    if (ins.nplus1?.length) {
      out.push(h('h4', {}, '⚠ Repeated queries (N+1?)'));
      ins.nplus1.forEach((g) => out.push(h('div', {class: 'card warn'}, h('b', {}, `${g.count}× · ${ms(g.ms)}`), h('pre', {}, g.sql), note('Fix: eager load with with() / load(), or move the query out of the loop.'))));
    }
    out.push(h('h4', {}, `Queries run by this view (${qs.reduce((a, q) => a + q.count, 0)})`));
    if (!qs.length) out.push(note('This view ran no queries of its own.', 'ok'));
    qs.forEach((q) => out.push(h('div', {class: 'card'}, h('div', {class: 'mut'}, `${q.count}× · ${ms(q.ms)}`), h('pre', {}, q.sql), q.bindings?.length ? h('div', {class: 'mut'}, 'bindings: ' + JSON.stringify(q.bindings)) : null)));
    return out;
  }

  function routeBlock(title, r) {
    if (!r) return [];
    const out = section(title,
      h('div', {class: 'card'},
        h('div', {}, h('b', {}, r.methods.join('|')), ' ', r.uri), r.name ? h('div', {class: 'mut'}, 'name: ' + r.name) : null,
        h('div', {class: 'mut'}, r.action), r.domain ? h('div', {class: 'mut'}, 'domain: ' + r.domain) : null,
        h('div', {style: 'margin-top:4px'}, r.middleware.map((m) => h('span', {class: 'pill'}, m)))),
      r.target ? fileRow(r.target, 'Open action') : null);
    if (r.parameters && Object.keys(r.parameters).length) out.push(h('div', {class: 'mut'}, 'Route parameters'), tree(r.parameters));
    (r.formRequests || []).forEach((fr) => {
      out.push(h('h4', {}, 'Form request — ' + fr.class.split('\\').pop()), fr.target ? fileRow(fr.target, 'Open rules') : null);
      if (fr.rules) out.push(h('table', {}, Object.entries(fr.rules).map(([f, rules]) => h('tr', {}, h('td', {class: 'k'}, f), h('td', {}, rules.map((x) => h('span', {class: 'pill'}, x)))))));
      else out.push(note('Rules could not be read statically.'));
    });
    return out;
  }
  const routeTab = (ins) => [...routeBlock('Page route', ins.route), ...routeBlock('Form action route', ins.formRoute)];

  // ───────────── text + translations (with in-source editing) ─────────────
  function saveControls(buildBody, onApply, onRevert) {
    const state = h('div', {class: 'mut', style: 'margin-top:6px'});
    const save = h('button', {class: 'act primary', onclick: async () => {
      save.disabled = true; state.className = 'mut'; state.textContent = 'Saving…';
      try {
        const r = await call('edit', buildBody());
        state.className = 'ok'; state.textContent = `Saved to ${r.relative}:${r.line} `;
        state.append(h('button', {class: 'act small', onclick: async () => {
          try { await call('undo', {undo: r.undo}); onRevert(); state.className = 'mut'; state.textContent = 'Undone.'; } catch (e) { state.className = 'bad'; state.textContent = e.message; }
        }}, 'Undo'));
        onApply?.();
      } catch (e) {
        state.className = 'bad'; state.textContent = e.message; onRevert();
        if (e.code === 'editing_disabled') state.textContent = 'Editing is off. Add LARASELECTOR_EDITING=true to .env, then reload the page.';
      }
      save.disabled = false;
    }}, 'Save to source');
    return [h('div', {class: 'row'}, save), state];
  }

  function textTab(c, own) {
    const out = [], ins = c.inspect, node = own.node;
    let committed = node.nodeValue.trim(), base = node.nodeValue;     // what the source currently says / DOM before preview
    const area = h('textarea', {}, committed);
    area.value = committed;
    area.addEventListener('input', () => { node.nodeValue = base.replace(committed, area.value); });
    out.push(h('h4', {}, 'Edit text'), area, ...saveControls(
      () => ({kind: 'text', id: c.id, old: committed, new: area.value}),
      () => { committed = area.value.trim(); base = node.nodeValue; },
      () => { node.nodeValue = base; area.value = committed; }));
    if (!caps?.editing) out.push(note('Saving to source requires LARASELECTOR_EDITING=true in .env. The preview above only changes this page.'));
    const tr = ins?.translations || [];
    out.push(h('h4', {}, 'Translations matching this text'));
    if (!tr.length) out.push(note('No lang entry has exactly this text, so it is probably written directly in the Blade file.'));
    tr.forEach((t) => {
      const input = h('input', {value: t.value});
      out.push(h('div', {class: 'card'},
        h('div', {}, h('span', {class: 'pill def'}, t.locale), h('b', {}, t.key)),
        fileRow(t, 'Open'), input,
        ...saveControls(() => ({kind: 'translation', path: t.source.path, line: t.source.line, old: t.value, new: input.value}), () => { t.value = input.value; }, () => { input.value = t.value; })));
    });
    return out;
  }

  // ───────────── css ─────────────
  function cssTab(c) {
    const el = c.el, ins = c.inspect, out = [];
    let committed = el.getAttribute('class') || '';
    const input = h('input', {value: committed});
    input.addEventListener('input', () => el.setAttribute('class', input.value));
    out.push(h('h4', {}, 'Classes (live preview)'), input, ...saveControls(
      () => ({kind: 'class', id: c.id, tag: el.localName, old: committed, new: input.value}),
      () => { committed = input.value; },
      () => { el.setAttribute('class', committed); input.value = committed; }));
    if (!caps?.editing) out.push(note('Saving to source requires LARASELECTOR_EDITING=true in .env.'));
    const classes = ins?.css?.classes || [];
    out.push(h('h4', {}, 'Where each class comes from'));
    if (!classes.length) out.push(note(ins ? 'No class information.' : 'Update the Laravel package for class tracing.'));
    classes.forEach((k) => {
      out.push(h('div', {class: 'row'}, h('span', {class: 'pill ' + (k.utility ? 'util' : 'def')}, k.class), k.utility ? h('span', {class: 'mut'}, 'utility / framework class') : null));
      k.matches.forEach((m) => out.push(fileRow(m, 'Open'), h('div', {class: 'mut', style: 'margin:-2px 0 4px 2px'}, m.text)));
    });
    if (ins?.css?.tailwindConfig) out.push(h('h4', {}, 'Tailwind'), fileRow(ins.css.tailwindConfig, 'Open config'));
    out.push(h('h4', {}, 'Rules matching this element (accessible stylesheets)'), ...matchedRules(el));
    return out;
  }
  function matchedRules(el) {
    const rows = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const src = sheet.ownerNode?.getAttribute?.('data-vite-dev-id') || sheet.href?.replace(location.origin, '') || 'inline <style>';
      const walk = (list) => { for (const r of list) {
        if (r.cssRules && !r.selectorText) walk(r.cssRules);
        else if (r.selectorText) { try { if (el.matches(r.selectorText) && !/^\*|^html|^body$/.test(r.selectorText)) rows.push([r.selectorText, src]); } catch {} }
      } };
      walk(rules);
      if (rows.length > 30) break;
    }
    return rows.length ? [h('table', {}, rows.slice(0, 30).map(([s, f]) => h('tr', {}, h('td', {class: 'k'}, s), h('td', {class: 'mut'}, f))))] : [note('None found (or stylesheets are cross-origin).')];
  }

  // ───────────── livewire / alpine ─────────────
  function liveTab(c, lw, alpine) {
    const out = [], t = c.resolved.targets || {};
    if (lw) {
      out.push(h('h4', {}, 'Livewire component'), h('div', {class: 'card'}, h('b', {}, lw.component), lw.action ? h('div', {class: 'mut'}, 'action under cursor: ' + lw.action + '()') : null));
      ['livewireComponent', 'livewireRender', 'livewireAction'].forEach((k) => t[k] && out.push(fileRow(t[k], {livewireComponent: 'Open class', livewireRender: 'Open render()', livewireAction: 'Open action'}[k])));
      out.push(h('h4', {}, 'Public properties (snapshot)'), lw.data && Object.keys(lw.data).length ? tree(redact(lw.data)) : note('No properties.'));
    }
    if (alpine) out.push(h('h4', {}, 'Alpine x-data'), h('pre', {}, alpine));
    return out;
  }

  // ───────────── report + screenshot ─────────────
  function contextOf(c) {
    const el = c.el, ins = c.inspect || {}, v = ins.view;
    return {
      page: location.href, title: document.title, selector: cssPath(el), tag: el.localName,
      classes: el.getAttribute('class') || '', text: ownText(el).text, blade: c.resolved?.source, targets: c.resolved?.targets || {},
      route: ins.route, formRoute: ins.formRoute, chain: v?.chain?.map((n) => n.path) || [], data: v?.renders?.[0]?.data,
      queries: v?.renders?.flatMap((r) => r.queries) || [], nplus1: ins.nplus1 || [],
      viewport: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, ua: navigator.userAgent,
    };
  }
  function markdownReport(x) {
    const routeLine = (r) => r ? `\`${r.methods.join('|')} ${r.uri}\`${r.name ? ` (${r.name})` : ''} → \`${r.action}\`` : null;
    return [
      `## Bug report — ${x.title || x.page}`, '',
      `- **Page:** ${x.page}`, `- **Element:** \`${x.selector}\`${x.classes ? ` — classes: \`${x.classes}\`` : ''}`,
      x.text ? `- **Text:** “${x.text}”` : null, x.blade ? `- **Blade:** \`${x.blade.path}:${x.blade.line}\`` : null,
      x.targets.pageController ? `- **Controller:** \`${x.targets.pageController.source.path}:${x.targets.pageController.source.line}\`` : null,
      x.targets.formAction ? `- **Form action:** \`${x.targets.formAction.source.path}:${x.targets.formAction.source.line}\`` : null,
      x.route ? `- **Route:** ${routeLine(x.route)}` : null, x.formRoute ? `- **Form route:** ${routeLine(x.formRoute)}` : null,
      x.chain.length ? `- **Render stack:** ${x.chain.map((p) => `\`${p}\``).join(' → ')}` : null,
      x.queries.length ? `- **Queries in this view:** ${x.queries.reduce((a, q) => a + q.count, 0)}${x.nplus1.length ? ` (⚠ ${x.nplus1.length} repeated pattern(s): ${x.nplus1.map((g) => g.count + '×').join(', ')})` : ''}` : null,
      `- **Viewport:** ${x.viewport}`, `- **Browser:** ${x.ua}`, '',
      x.data ? '<details><summary>View data</summary>\n\n```json\n' + JSON.stringify(x.data, null, 2).slice(0, 4000) + '\n```\n</details>\n' : null,
      '### Steps to reproduce', '1. ', '', '### Expected', '', '### Actual', '', '_Attach the screenshot (paste from clipboard)._',
    ].filter((l) => l !== null).join('\n');
  }
  function jiraReport(x) {
    const routeLine = (r) => r ? `{{${r.methods.join('|')} ${r.uri}}} -> {{${r.action}}}` : null;
    return [
      `h2. Bug report - ${x.title || x.page}`, '',
      `* *Page:* ${x.page}`, `* *Element:* {{${x.selector}}}${x.classes ? ` classes: {{${x.classes}}}` : ''}`,
      x.text ? `* *Text:* "${x.text}"` : null, x.blade ? `* *Blade:* {{${x.blade.path}:${x.blade.line}}}` : null,
      x.targets.pageController ? `* *Controller:* {{${x.targets.pageController.source.path}:${x.targets.pageController.source.line}}}` : null,
      x.route ? `* *Route:* ${routeLine(x.route)}` : null, x.chain.length ? `* *Render stack:* ${x.chain.join(' -> ')}` : null,
      `* *Viewport:* ${x.viewport}`, `* *Browser:* ${x.ua}`, '',
      x.data ? '{code:json}\n' + JSON.stringify(x.data, null, 2).slice(0, 4000) + '\n{code}\n' : null,
      'h3. Steps to reproduce', '# ', '', 'h3. Expected', '', 'h3. Actual', '', '_Attach the screenshot._',
    ].filter((l) => l !== null).join('\n');
  }

  async function screenshot(el) {
    el.scrollIntoView({block: 'center', inline: 'center'});
    root.style.visibility = 'hidden';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))));
    const r = el.getBoundingClientRect();
    let res; try { res = await chrome.runtime.sendMessage({type: 'capture'}); } finally { root.style.visibility = ''; }
    if (!res?.url) throw Error(res?.error || 'Screenshot failed. Click the extension icon once on this tab, then try again.');
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('Bad screenshot')); i.src = res.url; });
    const k = img.naturalWidth / innerWidth, pad = 12;
    const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
    const w = Math.min(innerWidth - x, r.width + pad * 2), hgt = Math.min(innerHeight - y, r.height + pad * 2);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * k)); canvas.height = Math.max(1, Math.round(hgt * k));
    const g = canvas.getContext('2d');
    g.drawImage(img, x * k, y * k, w * k, hgt * k, 0, 0, canvas.width, canvas.height);
    g.strokeStyle = '#7868ff'; g.lineWidth = 2 * k; g.strokeRect((r.left - x) * k, (r.top - y) * k, r.width * k, r.height * k);
    return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(Error('Cannot encode PNG'))), 'image/png'));
  }

  function reportTab(c) {
    const x = contextOf(c), st = h('div', {class: 'mut', style: 'margin-top:6px'});
    let shot = null;
    const getShot = async () => shot ||= await screenshot(c.el);
    const guard = (fn) => async () => { st.className = 'mut'; st.textContent = 'Working…'; try { await fn(); st.textContent = ''; } catch (e) { st.className = 'bad'; st.textContent = e.message; } };
    return [
      h('h4', {}, 'Screenshot of this element'),
      h('div', {class: 'row'},
        h('button', {class: 'act primary', onclick: guard(async () => { const b = await getShot(); await navigator.clipboard.write([new ClipboardItem({'image/png': b})]); toast('Screenshot copied'); })}, 'Copy image'),
        h('button', {class: 'act', onclick: guard(async () => { const b = await getShot(); h('a', {href: URL.createObjectURL(b), download: 'laraselector-element.png'}).click(); })}, 'Download PNG')),
      h('h4', {}, 'Bug report'),
      h('div', {class: 'row'},
        h('button', {class: 'act primary', onclick: () => copy(markdownReport(x), 'Markdown copied (GitHub / GitLab)')}, 'Copy Markdown'),
        h('button', {class: 'act', onclick: () => copy(jiraReport(x), 'Jira markup copied')}, 'Copy Jira')),
      st, h('h4', {}, 'Preview'), h('pre', {}, markdownReport(x)),
    ];
  }

  // ───────────── compare ─────────────
  const STYLE_PROPS = ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background-color', 'font-size', 'font-weight', 'border', 'border-radius'];
  async function snapshot(c) {
    const cs = getComputedStyle(c.el), ins = c.inspect || {};
    return {
      page: location.pathname, tag: c.el.localName, classes: (c.el.getAttribute('class') || '').split(/\s+/).filter(Boolean),
      blade: c.resolved ? `${c.resolved.source.path}:${c.resolved.source.line}` : '', text: ownText(c.el).text,
      route: ins.route ? `${ins.route.methods.join('|')} ${ins.route.uri}` : '', action: ins.route?.action || '',
      styles: Object.fromEntries(STYLE_PROPS.map((p) => [p, cs.getPropertyValue(p)])),
      data: ins.view?.renders?.[0]?.data || {}, chain: ins.view?.chain?.map((n) => n.path) || [],
    };
  }
  function diffTable(a, b, la, lb) {
    const rows = [], row = (name, x, y) => rows.push(h('tr', {}, h('td', {class: 'k'}, name), h('td', {class: x === y ? '' : 'diff'}, x), h('td', {class: x === y ? '' : 'diff'}, y)));
    const cls = (s) => s.classes.join(' ');
    row('page', a.page, b.page); row('blade', a.blade, b.blade); row('route', a.route, b.route); row('tag', a.tag, b.tag);
    const ca = new Set(a.classes), cb = new Set(b.classes);
    row('classes (only here)', a.classes.filter((x) => !cb.has(x)).join(' ') || '—', b.classes.filter((x) => !ca.has(x)).join(' ') || '—');
    row('classes (shared)', a.classes.filter((x) => cb.has(x)).join(' ') || '—', a.classes.filter((x) => cb.has(x)).join(' ') || '—');
    row('text', a.text, b.text); row('render stack', a.chain.join(' → '), b.chain.join(' → '));
    STYLE_PROPS.forEach((p) => row(p, a.styles[p], b.styles[p]));
    const keys = [...new Set([...Object.keys(a.data), ...Object.keys(b.data)])];
    keys.forEach((k) => row('data.' + k, k in a.data ? JSON.stringify(a.data[k]).slice(0, 120) : '(missing)', k in b.data ? JSON.stringify(b.data[k]).slice(0, 120) : '(missing)'));
    return h('table', {}, h('tr', {}, h('th', {}, ''), h('th', {}, la), h('th', {}, lb)), rows);
  }
  function compareTab(c) {
    const out = [h('h4', {}, 'Pin this element, then select another (even on another page)')];
    const view = h('div', {});
    out.push(h('div', {class: 'row'},
      h('button', {class: 'act primary', onclick: async () => { const s = await snapshot(c); await chrome.storage.local.set({ls_pinned: s}); toast('Pinned for comparison'); }}, 'Pin this element'),
      h('button', {class: 'act', onclick: async () => {
        const {ls_pinned: p} = await chrome.storage.local.get('ls_pinned');
        if (!p) return toast('Nothing pinned yet');
        view.replaceChildren(diffTable(p, await snapshot(c), `Pinned (${p.page})`, `This (${location.pathname})`));
      }}, 'Compare with pinned')), view);
    return out;
  }

  // ───────────── selection tab (multi-select) ─────────────
  function selectionTab() {
    const out = [h('h4', {}, `Selected elements (${selection.length})`)];
    selection.forEach((s, i) => out.push(h('div', {class: 'row'}, h('b', {}, `${i + 1}.`), h('span', {class: 'grow', title: s.resolved.source.path}, `${s.resolved.source.path}:${s.resolved.source.line}`),
      h('button', {class: 'act small', onclick: () => openUri(s.resolved.editorUri)}, 'Open'), h('button', {class: 'act small', onclick: () => toggleSelected(s.el)}, '✕'))));
    const view = h('div', {});
    out.push(h('div', {class: 'row', style: 'margin-top:8px'},
      h('button', {class: 'act primary', disabled: !selection.length, onclick: openAll}, 'Open all'),
      h('button', {class: 'act', disabled: selection.length !== 2, title: 'Select exactly 2 elements', onclick: async () => {
        const snaps = await Promise.all(selection.map(async (s) => snapshot({el: s.el, resolved: s.resolved, inspect: await call('inspect', {id: s.id, page: location.href, classes: [...s.el.classList], text: ownText(s.el).text, tag: s.el.localName}).catch(() => null)})));
        view.replaceChildren(diffTable(snaps[0], snaps[1], '#1', '#2'));
      }}, 'Compare 2'),
      h('button', {class: 'act', onclick: () => { selection.length = 0; drawBadges(); renderPanel(); }}, 'Clear')), view);
    return out;
  }
  function showSelectionPanel() { openPanel({title: 'Selection', tabs: [{id: 'selection', label: 'Selection', render: selectionTab}]}); }

  // ───────────── page panel (route, totals, inertia, views) + heatmap ─────────────
  let pageData = null;
  function inertiaInfo() {
    const node = document.querySelector('[data-page]');
    try { const j = JSON.parse(node?.getAttribute('data-page') && node.tagName !== 'SCRIPT' ? node.getAttribute('data-page') : node?.textContent || 'null'); return j?.component ? j : null; } catch { return null; }
  }
  async function loadPage() {
    const inertia = inertiaInfo();
    pageData = await call('page', {page: location.href, inertia: inertia ? {component: inertia.component} : undefined});
    pageData.inertiaPage = inertia;
    return pageData;
  }
  async function showPage() {
    await loadCaps();
    try { await loadPage(); } catch (e) { return toast(e.message); }
    const d = pageData, tabs = [{id: 'overview', label: 'Overview', render: () => pageOverview(d)}, {id: 'views', label: `Views (${d.views.length})`, render: () => pageViews(d)}];
    if (d.inertiaPage) tabs.push({id: 'inertia', label: 'Inertia', render: () => pageInertia(d)});
    openPanel({title: document.title || location.pathname, tabs});
  }
  function pageOverview(d) {
    const out = [];
    if (d.totals) out.push(h('h4', {}, 'This request'), h('div', {class: 'card'}, `${d.totals.renders} view renders · ${d.totals.queries} queries (${ms(d.totals.queryMs)})`));
    else out.push(note('No render data for this page. Reload it with the package enabled (and run php artisan view:clear once).', 'warn'));
    if (d.nplus1?.length) {
      out.push(h('h4', {}, '⚠ Possible N+1 queries'));
      d.nplus1.forEach((g) => out.push(h('div', {class: 'card warn'}, h('b', {}, `${g.count}× · ${ms(g.ms)}`), h('pre', {}, g.sql), g.views.length ? h('div', {class: 'mut'}, 'in ' + g.views.join(', ')) : null)));
    }
    return [...out, ...routeBlock('Route', d.route)];
  }
  function pageViews(d) {
    const max = Math.max(1, ...d.views.map((v) => v.self));
    return [h('div', {class: 'row'}, h('button', {class: 'act ' + (heatOn ? 'primary' : ''), onclick: () => { toggleHeat(); renderPanel(); }}, heatOn ? 'Hide heatmap' : 'Show heatmap on page')),
      ...[...d.views].sort((a, b) => b.self - a.self).map((v) => h('div', {class: 'card'},
        h('div', {class: 'row'}, h('span', {class: 'grow', title: v.path}, v.path), h('b', {}, ms(v.self))),
        h('div', {class: 'mut'}, `${v.count}× · ${ms(v.ms)} incl. · ${v.queries} queries`),
        h('div', {class: 'bar', style: `width:${Math.max(2, (v.self / max) * 100)}%`}), v.source ? fileRow(v) : null))];
  }
  function pageInertia(d) {
    const i = d.inertiaPage, out = [h('h4', {}, 'Inertia page'), h('div', {class: 'card'}, h('b', {}, i.component), h('div', {class: 'mut'}, i.url || ''))];
    out.push(d.inertia ? fileRow(d.inertia, 'Open component') : note('Component file not found in the configured inertia_paths.', 'warn'));
    out.push(h('h4', {}, 'Props'), tree(redact(i.props || {})));
    return out;
  }

  // heatmap: colour every top-level element of each rendered Blade file by that file's self time
  function toggleHeat() {
    heatOn = !heatOn;
    clearInterval(heatTimer);
    overlay.querySelectorAll('.heat').forEach((n) => n.remove());
    if (heatOn) { drawHeat(); heatTimer = setInterval(drawHeat, 2000); }
    chrome.runtime.sendMessage({type: 'state', heat: heatOn}).catch(() => {});
  }
  async function drawHeat() {
    if (!pageData) { try { await loadPage(); } catch (e) { heatOn = false; return toast(e.message); } }
    overlay.querySelectorAll('.heat').forEach((n) => n.remove());
    const byPath = new Map(pageData.views.map((v) => [v.path, v])), max = Math.max(1, ...pageData.views.map((v) => v.self));
    let drawn = 0;
    for (const el of document.querySelectorAll('[data-laraselector]')) {
      const p = tokenPath(el), v = byPath.get(p);
      if (!v) continue;
      const parent = el.parentElement?.closest('[data-laraselector]');
      if (parent && tokenPath(parent) === p) continue;   // only outline the top-level elements of each Blade file
      const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      const t = Math.min(1, v.self / max), hue = Math.round(120 - 120 * t), color = `hsl(${hue} 85% 52%)`;
      overlay.append(h('div', {class: 'heat', style: `left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px;border-color:${color};background:${color}22`},
        h('span', {style: `background:${color}`}, `${p.split(/[\\/]/).pop()} · ${v.self} ms`)));
      if (++drawn >= 300) break;
    }
  }

  // ───────────────────────── messaging ─────────────────────────
  chrome.runtime.onMessage.addListener((m, _, send) => {
    (async () => {
      if (m.type === 'toggle') { await (active ? stop('Selection stopped') : start()); send({active}); }
      else if (m.type === 'page') { await showPage(); send({ok: true}); }
      else if (m.type === 'heatmap') { toggleHeat(); send({heat: heatOn}); }
      else if (m.type === 'status') {
        const c = await loadCaps();
        send({supported: c.protocol > 0, protocol: c.protocol || 0, active, heat: heatOn, editing: !!c.editing, container: !!c.container, editor: c.editor});
      }
    })().catch(() => send({supported: false, active}));
    return true;
  });
})();
