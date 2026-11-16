// LaraSelector content script. It talks to the Laravel app (same origin, with the page's session),
// works on the page DOM, and publishes what it finds to the side panel, which renders the UI.
(() => {
  if (window.__laraselectorLoaded) return;
  window.__laraselectorLoaded = true;

  // ───────────────────────── state ─────────────────────────
  let active = false, token = null, caps = null, heatOn = false, heatTimer = null, pageData = null;
  let current = null;                 // the element shown in the side panel
  let lastView = null;                // last thing published to the side panel
  const selection = [];               // multi-select: {el, id, resolved}
  const resolveCache = new Map();
  const SECRET = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|csrf|private|credential|otp/i;

  // ───────────────────────── page overlay (highlight, badges, heatmap, toasts) ─────────────────────────
  const root = document.createElement('div');
  root.id = '__laraselector_root';
  const shadow = root.attachShadow({mode: 'closed'});
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}
    .box{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #4cc9a0;background:#4cc9a020}
    .tip{position:fixed;z-index:2147483646;pointer-events:none;background:#12161b;color:#fff;padding:6px 8px;border-radius:6px;font:12px ui-monospace,monospace;max-width:420px}
    .badge{position:fixed;z-index:2147483646;pointer-events:none;border:2px dashed #f0b34a;background:#f0b34a18}
    .badge b{position:absolute;top:-10px;left:-10px;background:#f0b34a;color:#12161b;border-radius:50%;width:20px;height:20px;display:grid;place-items:center;font:700 11px system-ui}
    .heat{position:absolute;z-index:2147483645;pointer-events:none;border:2px solid;border-radius:3px}
    .heat span{position:absolute;top:0;left:0;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#fff;font:600 10px ui-monospace,monospace;padding:1px 4px;border-bottom-right-radius:4px}
    .toast{position:fixed;z-index:2147483647;left:50%;bottom:20px;transform:translateX(-50%);background:#222a33;color:#fff;padding:8px 14px;border-radius:8px;font:12px system-ui}
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
  function toast(text) { const t = h('div', {class: 'toast'}, text); shadow.append(t); setTimeout(() => t.remove(), 2600); }

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

  // ───────────────────────── publishing to the side panel ─────────────────────────
  // Resolves true when a side panel received it. (The background worker also listens, so a plain
  // sendMessage never rejects; the panel answers {shown: true}.)
  async function publish(view) {
    lastView = view;
    try { return !!(await chrome.runtime.sendMessage({type: 'view', view}))?.shown; } catch { return false; }
  }
  const selectionItems = () => selection.map((s) => ({path: s.resolved.source.path, line: s.resolved.source.line, editorUri: s.resolved.editorUri}));

  // ───────────────────────── selection mode ─────────────────────────
  const inOverlay = (e) => e.composedPath?.().includes(root);
  const clearHover = () => { box.hidden = tip.hidden = true; };

  async function move(e) {
    if (inOverlay(e)) return;
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
    if (inOverlay(e)) return;
    const el = marker(e.target); if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.shiftKey) return toggleSelected(el);
    await showElement(el);
  }
  const noShiftSelect = (e) => { if (e.shiftKey && !inOverlay(e) && marker(e.target)) e.preventDefault(); };
  function key(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (lastView) { current = null; publish(null); } else stop('Selection stopped');
  }
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
    drawBadges(); republishSelection();
  }
  function republishSelection() {
    if (lastView?.kind === 'element') publish({...lastView, selected: selection.some((s) => s.el === current?.el), selection: selectionItems()});
    else if (selection.length) publish({kind: 'selection', selection: selectionItems()});
    else publish(null);
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

  // ───────────────────────── element → side panel ─────────────────────────
  async function showElement(el) {
    const own = ownText(el);
    const mine = current = {el, id: el.dataset.laraselector, resolved: null, inspect: null, error: null, inspectError: null,
      text: own.node ? {node: own.node, committed: own.node.nodeValue.trim(), base: own.node.nodeValue, prev: null} : null,
      cls: {committed: el.getAttribute('class') || '', prev: null}};
    publish({kind: 'loading'});
    await loadCaps();
    try { mine.resolved = await resolve(el); } catch (e) { mine.error = e; }
    if (current !== mine) return;
    if (mine.resolved) {
      try {
        mine.inspect = await call('inspect', {id: mine.id, page: location.href, form: formInfo(el), livewire: livewireInfo(el), text: own.text, classes: [...el.classList], tag: el.localName});
      } catch (e) { mine.inspectError = e; }
    }
    if (current !== mine) return;
    const shown = await publish(elementView(mine));
    if (!shown) toast('Open the LaraSelector side panel (toolbar icon) to see details.');
  }

  function elementView(c) {
    const el = c.el, lw = livewireInfo(el), r = c.resolved;
    return {
      kind: 'element', title: c.error ? 'Error' : `${r.source.path}:${r.source.line}`,
      error: c.error ? c.error.message : null, resolved: r, inspect: c.inspect,
      inspectError: c.inspectError ? {message: c.inspectError.message, code: c.inspectError.code} : null,
      text: c.text ? c.text.committed.slice(0, 2000) : '', classAttr: c.cls.committed, tag: el.localName,
      lw: lw ? {component: lw.component, action: lw.action, data: redact(lw.data)} : null, alpine: alpineInfo(el),
      caps: {editing: !!caps?.editing, container: !!caps?.container},
      ctx: contextOf(c), selected: selection.some((s) => s.el === el), selection: selectionItems(),
    };
  }

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

  // computed-style / structure snapshot used by Compare
  const STYLE_PROPS = ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background-color', 'font-size', 'font-weight', 'border', 'border-radius'];
  function snapshot(c) {
    const cs = getComputedStyle(c.el), ins = c.inspect || {};
    return {
      page: location.pathname, tag: c.el.localName, classes: (c.el.getAttribute('class') || '').split(/\s+/).filter(Boolean),
      blade: c.resolved ? `${c.resolved.source.path}:${c.resolved.source.line}` : '', text: ownText(c.el).text,
      route: ins.route ? `${ins.route.methods.join('|')} ${ins.route.uri}` : '', action: ins.route?.action || '',
      styles: Object.fromEntries(STYLE_PROPS.map((p) => [p, cs.getPropertyValue(p)])),
      data: ins.view?.renders?.[0]?.data || {}, chain: ins.view?.chain?.map((n) => n.path) || [],
    };
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
    return rows.slice(0, 30);
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
    g.strokeStyle = '#4cc9a0'; g.lineWidth = 2 * k; g.strokeRect((r.left - x) * k, (r.top - y) * k, r.width * k, r.height * k);
    return canvas.toDataURL('image/png');
  }

  // ───────────────────────── page info + heatmap ─────────────────────────
  function inertiaInfo() {
    const node = document.querySelector('[data-page]');
    try { const j = JSON.parse(node?.getAttribute('data-page') && node.tagName !== 'SCRIPT' ? node.getAttribute('data-page') : node?.textContent || 'null'); return j?.component ? j : null; } catch { return null; }
  }
  async function loadPage() {
    const inertia = inertiaInfo();
    pageData = await call('page', {page: location.href, inertia: inertia ? {component: inertia.component} : undefined});
    pageData.inertiaPage = inertia ? {component: inertia.component, url: inertia.url, props: redact(inertia.props || {})} : null;
    return pageData;
  }
  async function showPage() {
    await loadCaps();
    try { await loadPage(); } catch (e) { return toast(e.message); }
    current = null;
    const shown = await publish({kind: 'page', data: pageData, title: document.title || location.pathname});
    if (!shown) toast('Open the LaraSelector side panel (toolbar icon) to see page info.');
  }
  function toggleHeat() {
    heatOn = !heatOn;
    clearInterval(heatTimer);
    overlay.querySelectorAll('.heat').forEach((n) => n.remove());
    if (heatOn) { drawHeat(); heatTimer = setInterval(drawHeat, 2000); }
    chrome.runtime.sendMessage({type: 'state', heat: heatOn}).catch(() => {});
    return heatOn;
  }
  // colour every top-level element of each rendered Blade file by that file's self time
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

  // ───────────────────────── commands sent by the side panel ─────────────────────────
  const need = () => { if (!current) throw Error('Select an element first.'); return current; };
  const rpc = {
    getView: () => lastView,
    open: ({uri}) => { location.href = uri; },
    closeView: () => { current = null; publish(null); },
    // text edit: live preview on the page, then save to the Blade file
    previewText: ({value}) => { const t = need().text; if (t) t.node.nodeValue = t.base.replace(t.committed, value); },
    saveText: async ({value}) => {
      const c = need(), t = c.text, r = await call('edit', {kind: 'text', id: c.id, old: t.committed, new: value});
      t.prev = {committed: t.committed, base: t.base}; t.committed = value.trim(); t.base = t.node.nodeValue; return r;
    },
    revertText: () => { const t = need().text; t.node.nodeValue = t.base; return t.committed; },
    // class edit
    previewClass: ({value}) => need().el.setAttribute('class', value),
    saveClass: async ({value}) => {
      const c = need(), r = await call('edit', {kind: 'class', id: c.id, tag: c.el.localName, old: c.cls.committed, new: value});
      c.cls.prev = c.cls.committed; c.cls.committed = value; return r;
    },
    revertClass: () => { const c = need(); c.el.setAttribute('class', c.cls.committed); return c.cls.committed; },
    saveTranslation: ({path, line, old, new: value}) => call('edit', {kind: 'translation', path, line, old, new: value}),
    undo: async ({undo, kind}) => {
      await call('undo', {undo});
      const c = current;
      if (kind === 'text' && c?.text?.prev) { c.text.committed = c.text.prev.committed; c.text.base = c.text.prev.base; c.text.node.nodeValue = c.text.base; return c.text.committed; }
      if (kind === 'class' && c?.cls.prev != null) { c.cls.committed = c.cls.prev; c.el.setAttribute('class', c.cls.committed); return c.cls.committed; }
      return null;
    },
    screenshot: () => screenshot(need().el),
    matchedRules: () => matchedRules(need().el),
    snapshot: () => snapshot(need()),
    // multi-select
    toggleCurrent: () => toggleSelected(need().el),
    removeSelected: ({i}) => { selection.splice(i, 1); drawBadges(); republishSelection(); },
    clearSelection: () => { selection.length = 0; drawBadges(); republishSelection(); },
    openAll,
    compareSelection: () => Promise.all(selection.slice(0, 2).map(async (s) => snapshot({el: s.el, resolved: s.resolved,
      inspect: await call('inspect', {id: s.id, page: location.href, classes: [...s.el.classList], text: ownText(s.el).text, tag: s.el.localName}).catch(() => null)}))),
  };

  chrome.runtime.onMessage.addListener((m, _, send) => {
    (async () => {
      if (m.type === 'toggle') { await (active ? stop('Selection stopped') : start()); send({active}); }
      else if (m.type === 'page') { await showPage(); send({ok: true}); }
      else if (m.type === 'heatmap') { send({heat: toggleHeat()}); }
      else if (m.type === 'status') {
        const c = await loadCaps();
        send({supported: c.protocol > 0, protocol: c.protocol || 0, active, heat: heatOn, editing: !!c.editing, container: !!c.container, editor: c.editor});
      } else if (m.type === 'rpc') {
        try { send({ok: true, result: await rpc[m.name]?.(m.args || {})}); }
        catch (e) { send({ok: false, error: {message: e.message, code: e.code}}); }
      }
    })().catch(() => send({supported: false, active}));
    return true;
  });
})();
