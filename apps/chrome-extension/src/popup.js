const state=document.querySelector('#state'), button=document.querySelector('#toggle'); let tab;
async function message(type){return chrome.tabs.sendMessage(tab.id,{type}).catch(()=>null)}
async function inject(){await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});}
async function refresh(){const r=await message('status'); if(!r){state.textContent='Not a LaraSelector page';return} state.textContent=r.supported?'Ready on this local Laravel page':'LaraSelector is unavailable here'; button.disabled=!r.supported;button.textContent=r.active?'Stop selecting':'Start selecting';}
(async()=>{[tab]=await chrome.tabs.query({active:true,currentWindow:true});try{await inject();await refresh()}catch(e){state.textContent='Cannot inspect this page'}})();
button.onclick=async()=>{await message('toggle');setTimeout(refresh,80)};
