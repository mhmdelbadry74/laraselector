// LaraSelector side panel: connection status + controls, and the details UI for whatever the
// content script publishes (element, page info, multi-selection). All page access goes through rpc().
const $ = (id) => document.getElementById(id);
const els = {status: $('status'), statusText: $('statusText'), select: $('select'), page: $('page'), heat: $('heat'), heading: $('heading'),
  alert: $('alert'), alertTitle: $('alertTitle'), alertBody: $('alertBody'), alertBtn: $('alertBtn'), gear: $('gear'), settings: $('settings'),
  root: $('root'), editor: $('editor'), editing: $('editing'), protocol: $('protocol'), editingHint: $('editingHint'), grant: $('grantSite'),
  home: $('home'), detail: $('detail'), dtitle: $('dtitle'), tabs: $('tabs'), dbody: $('dbody')};

let tab = null, origin = null, state = {supported: false, active: false, heat: false};
let view = null, activeTab = null;

$('version').textContent = 'v' + chrome.runtime.getManifest().version;

// ───────────────────────── helpers ─────────────────────────
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
const setStatus = (kind, text) => { els.status.dataset.s = kind; els.statusText.textContent = text; };
const send = (type) => (tab ? chrome.tabs.sendMessage(tab.id, {type}).catch(() => null) : Promise.resolve(null));
const inject = () => chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});
const hostOf = (t) => { try { const u = new URL(t.url); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch { return null; } };
async function rpc(name, args) {
  const r = await chrome.tabs.sendMessage(tab.id, {type: 'rpc', name, args}).catch(() => null);
  if (!r) throw Error('Cannot reach the page. Reload it and try again.');
  if (!r.ok) { const e = Error(r.error.message); e.code = r.error.code; throw e; }
  return r.result;
}
function toast(text) { const t = h('div', {class: 'toast', role: 'status'}, text); document.body.append(t); setTimeout(() => t.remove(), 2400); }
async function copy(text, label = 'Copied') { try { await navigator.clipboard.writeText(text); toast(label); } catch { toast('Copy failed'); } }
const openUri = (uri, label) => rpc('open', {uri}).then(() => toast(label ? 'Opening ' + label : 'Opening editor')).catch((e) => toast(e.message));
const ms = (v) => `${v} ms`;
const section = (title, ...kids) => [h('h4', {}, title), ...kids];
const note = (text, cls = 'mut') => h('div', {class: cls, style: 'margin:8px 0'}, text);
const SECRET = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|csrf|private|credential|otp/i;
function redact(v, depth = 0) {
  if (Array.isArray(v)) return depth > 5 ? '…' : v.map((x) => redact(x, depth + 1));
  if (v && typeof v === 'object') return depth > 5 ? '…' : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '••• redacted' : redact(x, depth + 1)]));
  return v;
}

// ───────────────────────── connection + controls ─────────────────────────
function showAlert(title, body, btnText, onClick) {
  els.alert.hidden = !title;
  els.alertTitle.textContent = title || '';
  els.alertBody.textContent = body || '';
  els.alertBtn.hidden = !btnText;
  els.alertBtn.textContent = btnText || '';
  els.alertBtn.onclick = onClick || null;
}

function renderControls() {
  const ok = state.supported, v3 = state.protocol >= 3;
  els.select.disabled = !ok;
  els.select.setAttribute('aria-pressed', String(!!state.active));
  els.select.lastChild.textContent = state.active ? 'Stop' : 'Select';
  els.page.disabled = !ok || !v3;
  els.heat.disabled = !ok || !v3;
  els.heat.setAttribute('aria-pressed', String(!!state.heat));
  els.heading.textContent = state.active ? 'Click any element on the page' : ok ? 'Press Select to start' : 'Open a local Laravel page';
  els.editor.textContent = state.editor || '—';
  els.editing.textContent = ok ? (state.editing ? 'On' : 'Off') : '—';
  els.protocol.textContent = ok ? String(state.protocol) : '—';
  els.editingHint.hidden = !ok || state.editing;
  if (ok && !v3) showAlert('Package is out of date', 'Run composer update mhmdelbadry74/laraselector-laravel and php artisan view:clear to unlock page info, the heatmap, data and editing.');
  else if (ok && state.container) showAlert('Running in a container?', 'If editor links do not open, set “Project path on this machine” in settings.', 'Open settings', () => toggleSettings(true));
  else if (ok) showAlert();
}

async function connect() {
  els.grant.hidden = true;
  state = {supported: false, active: false, heat: false};
  setView(null);
  if (!tab) { setStatus('warn', 'No tab'); showAlert('No active tab', 'Click a tab with your Laravel app, then use Select.'); return renderControls(); }
  // tab.url is hidden until the extension has access to the tab (e.g. when the panel was opened from
  // Chrome's own side-panel menu instead of the LaraSelector toolbar icon).
  if (tab.url && !hostOf(tab)) { setStatus('warn', 'Not a web page'); showAlert('Open a local Laravel page', `LaraSelector sees this tab as “${tab.url.slice(0, 80)}”, which is not a web page. Click the tab that runs your app.`); return renderControls(); }
  origin = tab.url ? hostOf(tab) : null;
  let r = await send('status');
  if (!r) {
    try { await inject(); r = await send('status'); }
    catch {
      setStatus('bad', 'Needs access');
      els.grant.hidden = false;
      showAlert('LaraSelector needs access to this tab',
        origin ? 'Click the toolbar icon on this tab once, or allow it for this site.'
          : 'Chrome hides this tab from the extension when the panel is opened from its side-panel menu. Click the LaraSelector toolbar icon on this tab, or allow web pages once.',
        origin ? 'Allow on this site' : 'Allow on web pages', grant);
      return renderControls();
    }
  }
  if (!r) { setStatus('warn', 'Not connected'); return renderControls(); }
  state = r;
  setStatus(r.supported ? 'ok' : 'warn', r.supported ? 'Connected' : 'Not a LaraSelector page');
  if (!r.supported) showAlert('LaraSelector is not enabled here', 'Set LARASELECTOR_ENABLED=true, run php artisan view:clear, and reload.');
  renderControls();
  if (r.supported) rpc('getView').then(setView).catch(() => {});
}

async function grant() {
  const origins = origin ? [origin + '/*'] : ['http://*/*', 'https://*/*'];
  const ok = await chrome.permissions.request({origins}).catch(() => false);
  if (ok) { await loadTab(); }
}
els.grant.onclick = grant;

function toggleSettings(force) {
  const open = force ?? els.settings.hidden;
  els.settings.hidden = !open;
  els.gear.setAttribute('aria-expanded', String(open));
}
els.gear.onclick = () => toggleSettings();
els.select.onclick = async () => { const r = await send('toggle'); if (r) state.active = r.active; renderControls(); };
els.page.onclick = () => send('page');
els.heat.onclick = async () => { const r = await send('heatmap'); if (r) state.heat = r.heat; renderControls(); if (view?.kind === 'page') renderDetail(); };
$('dclose').onclick = () => rpc('closeView').catch(() => setView(null));

async function loadTab() {
  // A side panel is not a normal tab, so "currentWindow" can be wrong: prefer the last focused window,
  // and among candidates prefer a real web page.
  const found = [...await chrome.tabs.query({active: true, lastFocusedWindow: true}), ...await chrome.tabs.query({active: true, currentWindow: true})];
  tab = found.find((t) => t.url && hostOf(t)) || found.find((t) => !t.url) || found[0];
  const o = tab?.url ? hostOf(tab) : null;
  els.root.disabled = !o;
  if (o) {
    const key = 'hostRoot:' + o;
    els.root.value = (await chrome.storage.local.get(key))[key] || '';
    els.root.onchange = () => chrome.storage.local.set({[key]: els.root.value.trim()});
  } else els.root.value = '';
  connect();
}
chrome.tabs.onActivated.addListener(loadTab);
chrome.tabs.onUpdated.addListener((id, info) => { if (tab && id === tab.id && info.status === 'complete') loadTab(); });
chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (sender.tab?.id !== tab?.id) return;
  if (m?.type === 'state') {
    if ('active' in m) state.active = m.active;
    if ('heat' in m) state.heat = m.heat;
    renderControls();
  } else if (m?.type === 'view') {
    setView(m.view);
    sendResponse({shown: true});
  }
});

// ───────────────────────── detail view ─────────────────────────
function setView(v) {
  view = v && v.kind ? v : null;
  els.home.hidden = !!view;
  els.detail.hidden = !view;
  if (view) renderDetail();
}

function tabsFor(v) {
  if (v.kind === 'loading') return [{id: 'open', label: 'Open', render: () => note('Loading source info…')}];
  if (v.kind === 'selection') return [{id: 'selection', label: 'Selection', render: () => selectionTab(v)}];
  if (v.kind === 'page') {
    const d = v.data, t = [{id: 'overview', label: 'Overview', render: () => pageOverview(d)}, {id: 'views', label: `Views (${d.views.length})`, render: () => pageViews(d)}];
    if (d.inertiaPage) t.push({id: 'inertia', label: 'Inertia', render: () => pageInertia(d)});
    return t;
  }
  const ins = v.inspect, t = [{id: 'open', label: 'Open', render: () => openTab(v)}];
  if (ins?.view) t.push({id: 'data', label: 'Data', render: () => dataTab(ins)}, {id: 'stack', label: 'Stack', render: () => stackTab(ins)},
    {id: 'queries', label: `Queries${ins.nplus1?.length ? ' ⚠' : ''}`, render: () => queriesTab(ins)});
  if (ins?.route || ins?.formRoute) t.push({id: 'route', label: 'Route', render: () => routeTab(ins)});
  if (v.text) t.push({id: 'text', label: 'Text', render: () => textTab(v)});
  if (v.classAttr.trim()) t.push({id: 'css', label: 'CSS', render: () => cssTab(v)});
  if (v.lw || v.alpine) t.push({id: 'live', label: v.lw ? 'Livewire' : 'Alpine', render: () => liveTab(v)});
  t.push({id: 'report', label: 'Report', render: () => reportTab(v)}, {id: 'compare', label: 'Compare', render: () => compareTab()});
  if (v.selection?.length) t.push({id: 'selection', label: `Selection (${v.selection.length})`, render: () => selectionTab(v)});
  return t;
}

function renderDetail() {
  const tabs = tabsFor(view);
  if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;
  els.dtitle.textContent = view.kind === 'page' ? (view.title || 'Page') : view.kind === 'selection' ? 'Selection' : view.kind === 'loading' ? 'Loading…' : view.title;
  els.dtitle.title = els.dtitle.textContent;
  els.tabs.replaceChildren(...tabs.map((t) => h('button', {class: 'tab', role: 'tab', 'aria-selected': t.id === activeTab, onclick: () => { activeTab = t.id; renderDetail(); }}, t.label)));
  els.dbody.replaceChildren();
  const t = tabs.find((x) => x.id === activeTab);
  try { [t.render()].flat(Infinity).forEach((n) => n && els.dbody.append(n.nodeType ? n : document.createTextNode(String(n)))); }
  catch (e) { els.dbody.append(h('div', {class: 'bad'}, e.message)); }
}

// ───────────── reusable renderers ─────────────
function fileRow(target, label) {
  return h('div', {class: 'row'},
    h('button', {class: 'act primary', onclick: () => openUri(target.editorUri, `${target.source.path}:${target.source.line}`)}, label || 'Open'),
    h('span', {class: 'g', title: `${target.source.path}:${target.source.line}`}, `${target.source.path}:${target.source.line}`),
    h('button', {class: 'act small', title: 'Copy path', 'aria-label': 'Copy path', onclick: () => copy(`${target.source.path}:${target.source.line}`)}, '⧉'));
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
  return h('div', {style: 'margin-left:12px;word-break:break-word'}, label, h('span', {class: cls}, typeof value === 'string' ? JSON.stringify(value) : String(value)));
}

// ───────────── element tabs ─────────────
function openTab(v) {
  if (v.error) return note(v.error, 'bad');
  const labels = {blade: 'Blade', pageController: 'Page controller', formAction: 'Form action', livewireAction: 'Livewire action', livewireComponent: 'Livewire component', livewireRender: 'Livewire render()'};
  const out = [h('h4', {}, 'Open in editor')];
  Object.entries(v.resolved.targets || {}).forEach(([k, t]) => out.push(h('div', {class: 'mut'}, labels[k] || k), fileRow(t)));
  if (v.inspectError) out.push(note(v.inspectError.code ? v.inspectError.message : 'Details need LaraSelector package 0.2+ (composer update mhmdelbadry74/laraselector-laravel, then php artisan view:clear).', 'warn'));
  else if (!v.inspect?.view) out.push(note('No render data for this request. Reload the page after updating the package and running php artisan view:clear.', 'warn'));
  if (v.inspect?.nplus1?.length) out.push(note(`⚠ ${v.inspect.nplus1.length} repeated query pattern(s) in this view (possible N+1). See Queries.`, 'warn'));
  if (v.caps?.container) out.push(note('Running in a container: if editor links do not open, set “Project path on this machine” in settings.', 'warn'));
  out.push(h('h4', {}, 'Selection'), h('div', {class: 'row'},
    h('button', {class: 'act', onclick: () => rpc('toggleCurrent').catch((e) => toast(e.message))}, v.selected ? 'Remove from selection' : 'Add to selection'),
    h('span', {class: 'mut'}, 'or Shift+click')));
  return out;
}

function dataTab(ins) {
  const v = ins.view, out = [h('div', {class: 'mut'}, `${v.path} · rendered ${v.count}× · ${ms(v.ms)} total, ${ms(v.self)} self`)];
  v.renders.forEach((r, i) => {
    out.push(h('h4', {}, v.renders.length > 1 ? `Render ${i + 1} of ${v.count}` : 'Variables'));
    out.push(Object.keys(r.data).length ? tree(r.data) : note('No variables.'));
  });
  if (v.count > v.renders.length) out.push(note(`…and ${v.count - v.renders.length} more renders (only the first ${v.renders.length} kept).`));
  return out;
}
function stackTab(ins) {
  return [h('h4', {}, 'Render stack (outermost first)'), note('A layout renders inside the page that @extends it, so it appears after it here.'),
    ...ins.view.chain.map((n, i) => h('div', {class: 'card', style: `margin-left:${Math.min(i, 6) * 12}px`},
      h('div', {style: 'word-break:break-word'}, n.path), h('div', {class: 'mut'}, `${ms(n.ms)} total · ${ms(n.self)} self`), n.source ? fileRow(n) : null))];
}
function queriesTab(ins) {
  const qs = ins.view.renders.flatMap((r) => r.queries), out = [];
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
      h('div', {class: 'mut', style: 'word-break:break-word'}, r.action), r.domain ? h('div', {class: 'mut'}, 'domain: ' + r.domain) : null,
      h('div', {style: 'margin-top:6px'}, r.middleware.map((m) => h('span', {class: 'pill'}, m)))),
    r.target ? fileRow(r.target, 'Open action') : null);
  if (r.parameters && Object.keys(r.parameters).length) out.push(h('div', {class: 'mut'}, 'Route parameters'), tree(r.parameters));
  (r.formRequests || []).forEach((fr) => {
    out.push(h('h4', {}, 'Form request — ' + fr.class.split('\\').pop()), fr.target ? fileRow(fr.target, 'Open rules') : null);
    if (fr.rules) out.push(h('table', {class: 'dtable'}, Object.entries(fr.rules).map(([f, rules]) => h('tr', {}, h('td', {class: 'k'}, f), h('td', {}, rules.map((x) => h('span', {class: 'pill'}, x)))))));
    else out.push(note('Rules could not be read statically.'));
  });
  return out;
}
const routeTab = (ins) => [...routeBlock('Page route', ins.route), ...routeBlock('Form action route', ins.formRoute)];

// ───────────── editing (text / class / translation) ─────────────
// run: () => Promise<result of edit>; onRevert: put the preview back; onUndo(r): after a successful undo
function saveControls(run, onRevert, undoKind) {
  const state = h('div', {class: 'mut', style: 'margin-top:8px'});
  const save = h('button', {class: 'act primary', onclick: async () => {
    save.disabled = true; state.className = 'mut'; state.textContent = 'Saving…';
    try {
      const r = await run();
      state.className = 'ok'; state.textContent = `Saved to ${r.relative}:${r.line} `;
      state.append(h('button', {class: 'act small', onclick: async () => {
        try { const back = await rpc('undo', {undo: r.undo, kind: undoKind}); onRevert(back); state.className = 'mut'; state.textContent = 'Undone.'; }
        catch (e) { state.className = 'bad'; state.textContent = e.message; }
      }}, 'Undo'));
    } catch (e) {
      state.className = 'bad';
      state.textContent = e.code === 'editing_disabled' ? 'Editing is off. Add LARASELECTOR_EDITING=true to .env, then reload the page.' : e.message;
      onRevert();
    }
    save.disabled = false;
  }}, 'Save to source');
  return [h('div', {class: 'row'}, save), state];
}

function textTab(v) {
  const out = [], ins = v.inspect;
  const area = h('textarea', {'aria-label': 'Text'}); area.value = v.text;
  area.addEventListener('input', () => rpc('previewText', {value: area.value}).catch(() => {}));
  const revert = async (back) => { area.value = back ?? await rpc('revertText').catch(() => v.text); };
  out.push(h('h4', {}, 'Edit text'), area, ...saveControls(() => rpc('saveText', {value: area.value}), revert, 'text'));
  if (!v.caps.editing) out.push(note('Saving to source requires LARASELECTOR_EDITING=true in .env. The preview above only changes this page.'));
  const tr = ins?.translations || [];
  out.push(h('h4', {}, 'Translations matching this text'));
  if (!tr.length) out.push(note('No lang entry has exactly this text, so it is probably written directly in the Blade file.'));
  tr.forEach((t) => {
    const input = h('textarea', {style: 'min-height:42px', 'aria-label': 'Translation'}); input.value = t.value;
    out.push(h('div', {class: 'card'},
      h('div', {}, h('span', {class: 'pill def'}, t.locale), h('b', {}, t.key)),
      fileRow(t, 'Open'), input,
      ...saveControls(async () => { const r = await rpc('saveTranslation', {path: t.source.path, line: t.source.line, old: t.value, new: input.value}); t.value = input.value; return r; },
        () => { input.value = t.value; }, 'translation')));
  });
  return out;
}

function cssTab(v) {
  const ins = v.inspect, out = [];
  const input = h('textarea', {style: 'min-height:48px', 'aria-label': 'Classes'}); input.value = v.classAttr;
  input.addEventListener('input', () => rpc('previewClass', {value: input.value}).catch(() => {}));
  const revert = async (back) => { input.value = back ?? await rpc('revertClass').catch(() => v.classAttr); };
  out.push(h('h4', {}, 'Classes (live preview)'), input, ...saveControls(() => rpc('saveClass', {value: input.value}), revert, 'class'));
  if (!v.caps.editing) out.push(note('Saving to source requires LARASELECTOR_EDITING=true in .env.'));
  const classes = ins?.css?.classes || [];
  out.push(h('h4', {}, 'Where each class comes from'));
  if (!classes.length) out.push(note(ins ? 'No class information.' : 'Update the Laravel package for class tracing.'));
  classes.forEach((k) => {
    out.push(h('div', {class: 'row'}, h('span', {class: 'pill ' + (k.utility ? '' : 'def')}, k.class), k.utility ? h('span', {class: 'mut'}, 'utility / framework class') : null));
    k.matches.forEach((m) => out.push(fileRow(m, 'Open'), h('div', {class: 'mut', style: 'margin:-2px 0 6px 2px;word-break:break-word'}, m.text)));
  });
  if (ins?.css?.tailwindConfig) out.push(h('h4', {}, 'Tailwind'), fileRow(ins.css.tailwindConfig, 'Open config'));
  const rules = h('div', {}, note('Loading…'));
  rpc('matchedRules').then((rows) => rules.replaceChildren(rows.length
    ? h('table', {class: 'dtable'}, rows.map(([s, f]) => h('tr', {}, h('td', {class: 'k'}, s), h('td', {class: 'mut'}, f))))
    : note('None found (or stylesheets are cross-origin).'))).catch((e) => rules.replaceChildren(note(e.message, 'bad')));
  out.push(h('h4', {}, 'Rules matching this element'), rules);
  return out;
}

function liveTab(v) {
  const out = [], t = v.resolved.targets || {}, lw = v.lw;
  if (lw) {
    out.push(h('h4', {}, 'Livewire component'), h('div', {class: 'card'}, h('b', {}, lw.component), lw.action ? h('div', {class: 'mut'}, 'action under cursor: ' + lw.action + '()') : null));
    ['livewireComponent', 'livewireRender', 'livewireAction'].forEach((k) => t[k] && out.push(fileRow(t[k], {livewireComponent: 'Open class', livewireRender: 'Open render()', livewireAction: 'Open action'}[k])));
    out.push(h('h4', {}, 'Public properties (snapshot)'), lw.data && Object.keys(lw.data).length ? tree(redact(lw.data)) : note('No properties.'));
  }
  if (v.alpine) out.push(h('h4', {}, 'Alpine x-data'), h('pre', {}, v.alpine));
  return out;
}

// ───────────── report + screenshot ─────────────
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
function reportTab(v) {
  const x = v.ctx, st = h('div', {class: 'mut', style: 'margin-top:8px'});
  let shot = null;
  const getShot = async () => shot ||= await (await fetch(await rpc('screenshot'))).blob();
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
function diffTable(a, b, la, lb) {
  const rows = [], row = (name, x, y) => rows.push(h('tr', {}, h('td', {class: 'k'}, name), h('td', {class: x === y ? '' : 'diff'}, x), h('td', {class: x === y ? '' : 'diff'}, y)));
  row('page', a.page, b.page); row('blade', a.blade, b.blade); row('route', a.route, b.route); row('tag', a.tag, b.tag);
  const ca = new Set(a.classes), cb = new Set(b.classes);
  row('classes (only here)', a.classes.filter((x) => !cb.has(x)).join(' ') || '—', b.classes.filter((x) => !ca.has(x)).join(' ') || '—');
  row('classes (shared)', a.classes.filter((x) => cb.has(x)).join(' ') || '—', a.classes.filter((x) => cb.has(x)).join(' ') || '—');
  row('text', a.text, b.text); row('render stack', a.chain.join(' → '), b.chain.join(' → '));
  STYLE_PROPS.forEach((p) => row(p, a.styles[p], b.styles[p]));
  [...new Set([...Object.keys(a.data), ...Object.keys(b.data)])].forEach((k) =>
    row('data.' + k, k in a.data ? JSON.stringify(a.data[k]).slice(0, 120) : '(missing)', k in b.data ? JSON.stringify(b.data[k]).slice(0, 120) : '(missing)'));
  return h('table', {class: 'dtable'}, h('tr', {}, h('th', {}, ''), h('th', {}, la), h('th', {}, lb)), rows);
}
function compareTab() {
  const view2 = h('div', {});
  return [h('h4', {}, 'Pin this element, then select another (even on another page)'),
    h('div', {class: 'row'},
      h('button', {class: 'act primary', onclick: async () => { try { await chrome.storage.local.set({ls_pinned: await rpc('snapshot')}); toast('Pinned for comparison'); } catch (e) { toast(e.message); } }}, 'Pin this element'),
      h('button', {class: 'act', onclick: async () => {
        const {ls_pinned: p} = await chrome.storage.local.get('ls_pinned');
        if (!p) return toast('Nothing pinned yet');
        try { view2.replaceChildren(diffTable(p, await rpc('snapshot'), `Pinned (${p.page})`, 'This element')); } catch (e) { toast(e.message); }
      }}, 'Compare with pinned')), view2];
}

// ───────────── multi-selection ─────────────
function selectionTab(v) {
  const sel = v.selection || [], out = [h('h4', {}, `Selected elements (${sel.length})`)];
  if (!sel.length) out.push(note('Shift+click elements on the page to add them.'));
  sel.forEach((s, i) => out.push(h('div', {class: 'row'}, h('b', {}, `${i + 1}.`), h('span', {class: 'g', title: s.path}, `${s.path}:${s.line}`),
    h('button', {class: 'act small', onclick: () => openUri(s.editorUri)}, 'Open'),
    h('button', {class: 'act small', 'aria-label': 'Remove', onclick: () => rpc('removeSelected', {i}).catch((e) => toast(e.message))}, '✕'))));
  const result = h('div', {});
  out.push(h('div', {class: 'row', style: 'margin-top:10px'},
    h('button', {class: 'act primary', disabled: !sel.length, onclick: () => rpc('openAll').catch((e) => toast(e.message))}, 'Open all'),
    h('button', {class: 'act', disabled: sel.length !== 2, title: 'Select exactly 2 elements', onclick: async () => {
      try { const [a, b] = await rpc('compareSelection'); result.replaceChildren(diffTable(a, b, '#1', '#2')); } catch (e) { toast(e.message); }
    }}, 'Compare 2'),
    h('button', {class: 'act', disabled: !sel.length, onclick: () => rpc('clearSelection').catch((e) => toast(e.message))}, 'Clear')), result);
  return out;
}

// ───────────── page info ─────────────
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
  return [h('div', {class: 'row'}, h('button', {class: 'act ' + (state.heat ? 'primary' : ''), onclick: () => els.heat.click()}, state.heat ? 'Hide heatmap' : 'Show heatmap on page')),
    ...[...d.views].sort((a, b) => b.self - a.self).map((v) => h('div', {class: 'card'},
      h('div', {class: 'row'}, h('span', {class: 'g', title: v.path}, v.path), h('b', {}, ms(v.self))),
      h('div', {class: 'mut'}, `${v.count}× · ${ms(v.ms)} incl. · ${v.queries} queries`),
      h('div', {class: 'bar', style: `width:${Math.max(2, (v.self / max) * 100)}%`}), v.source ? fileRow(v) : null))];
}
function pageInertia(d) {
  const i = d.inertiaPage, out = [h('h4', {}, 'Inertia page'), h('div', {class: 'card'}, h('b', {}, i.component), h('div', {class: 'mut'}, i.url || ''))];
  out.push(d.inertia ? fileRow(d.inertia, 'Open component') : note('Component file not found in the configured inertia_paths.', 'warn'));
  out.push(h('h4', {}, 'Props'), tree(i.props || {}));
  return out;
}

loadTab();
