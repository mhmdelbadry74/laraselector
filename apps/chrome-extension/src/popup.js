const $ = (s) => document.querySelector(s);
const state = $('#state'), toggle = $('#toggle'), page = $('#page'), heat = $('#heat'), hint = $('#hint'), root = $('#root');
let tab, origin;

const send = (type) => chrome.tabs.sendMessage(tab.id, {type}).catch(() => null);
const inject = () => chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});

async function refresh() {
  const r = await send('status');
  if (!r) { state.textContent = 'Not a LaraSelector page'; return; }
  state.textContent = r.supported ? 'Ready on this local Laravel page' : 'LaraSelector is unavailable here';
  toggle.disabled = !r.supported;
  toggle.textContent = r.active ? 'Stop selecting' : 'Start selecting';
  const v3 = r.protocol >= 3;
  page.disabled = heat.disabled = !r.supported || !v3;
  heat.textContent = r.heat ? 'Hide heatmap' : 'Heatmap';
  hint.textContent = r.supported && !v3 ? 'Update the Laravel package to 0.2+ for page info, heatmap, data and editing.' : '';
}

(async () => {
  [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  try {
    origin = new URL(tab.url).origin;
    const key = 'hostRoot:' + origin;
    root.value = (await chrome.storage.local.get(key))[key] || '';
    root.addEventListener('change', () => chrome.storage.local.set({[key]: root.value.trim()}));
    await inject();
    await refresh();
  } catch (e) { state.textContent = 'Cannot inspect this page'; }
})();

toggle.onclick = async () => { await send('toggle'); setTimeout(refresh, 80); };
page.onclick = async () => { await send('page'); window.close(); };
heat.onclick = async () => { await send('heatmap'); setTimeout(refresh, 80); };
