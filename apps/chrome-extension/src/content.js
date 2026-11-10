(() => {
  if (window.__laraselectorLoaded) return;
  window.__laraselectorLoaded = true;
  let active = false, token = null, box, tip;
  const root = document.createElement('div'); root.id = '__laraselector_root';
  const shadowRoot = root.attachShadow({mode: 'closed'});
  shadowRoot.innerHTML = `<style>.box{position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #5b4bff;background:#5b4bff20}.tip{position:fixed;z-index:2147483647;pointer-events:none;background:#141222;color:white;padding:7px 9px;border-radius:6px;font:12px ui-monospace,monospace;max-width:360px}</style><div class=box hidden></div><div class=tip hidden></div>`;
  document.documentElement.append(root); [box, tip] = shadowRoot.querySelectorAll('div');
  const marker = e => e?.closest?.('[data-laraselector]');
  const api = path => `${location.origin}/__laraselector/${path}`;
  async function handshake() { const r = await fetch(api('handshake'), {method:'POST', credentials:'same-origin', headers:{'X-Requested-With':'LaraSelector'}}); if (!r.ok) throw Error('Local API unavailable'); return r.headers.get('X-LaraSelector-Token'); }
  async function resolve(id) { const r = await fetch(api('resolve'), {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-LaraSelector-Token':token}, body:JSON.stringify({id})}); const j = await r.json(); if (!r.ok) throw Error(j.error?.message || 'Cannot resolve source'); return j; }
  function clear() { box.hidden = tip.hidden = true; }
  function stop(message) { active=false; clear(); document.removeEventListener('pointermove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true); chrome.runtime.sendMessage({type:'state', active:false, message}); }
  async function move(e) { const el=marker(e.target); if(!el){clear();return} const r=el.getBoundingClientRect(); box.hidden=false; Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}); try { const s=await resolve(el.dataset.laraselector); tip.textContent=`${s.source.path}:${s.source.line}`; tip.hidden=false; Object.assign(tip.style,{left:Math.max(8,r.left)+'px',top:Math.max(8,r.top-30)+'px'}); } catch(err) { tip.textContent=err.message; tip.hidden=false; } }
  async function click(e) { const el=marker(e.target); if(!el) return; e.preventDefault(); e.stopImmediatePropagation(); try { const s=await resolve(el.dataset.laraselector); location.href=s.editorUri; stop('Opening '+s.source.path+':'+s.source.line); } catch(err) { tip.textContent=err.message; } }
  function key(e) { if(e.key==='Escape') {e.preventDefault();stop('Selection stopped');} }
  async function start() { try { token=await handshake(); active=true; document.addEventListener('pointermove',move,true); document.addEventListener('click',click,true); document.addEventListener('keydown',key,true); chrome.runtime.sendMessage({type:'state',active:true,message:'Select an element'}); } catch(e) {stop(e.message);} }
  chrome.runtime.onMessage.addListener((m,_,send)=>{ if(m.type==='toggle') (active?stop('Selection stopped'):start()).then(()=>send({active})); if(m.type==='status') fetch(api('capabilities'),{credentials:'same-origin'}).then(r=>send({supported:r.ok,active})).catch(()=>send({supported:false,active})); return true; });
})();
