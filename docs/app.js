document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{
  const t=b.parentElement.querySelector('pre').innerText.trim();
  try{await navigator.clipboard.writeText(t);const o=b.textContent;b.textContent='✓';setTimeout(()=>b.textContent=o,1200)}catch(e){}
}));
