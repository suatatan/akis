const demo = document.querySelector('#demo');
const text = document.querySelector('#demo-text');
let first = null, last = null;
const clock = seconds => { const n = Math.max(0,Math.floor(seconds)); return String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0'); };
const words = value => (value.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
function reset() { first=last=null; document.querySelector('#demo-time').textContent='00:00'; document.querySelector('#demo-status').textContent='İlk harfinle başlar'; document.querySelector('#demo-gap').textContent='10 sn mola sınırı'; }
function tick() {
  const now=performance.now();
  if(last!==null && now-last>10000) { const finished=clock((last-first)/1000); reset(); document.querySelector('#demo-status').textContent='Son akışın '+finished+'. Yeniden başlayabilirsin.'; }
  if(first!==null) {
    document.querySelector('#demo-time').textContent=clock((last-first)/1000);
    document.querySelector('#demo-status').textContent='Düşünceni takip et.';
    document.querySelector('#demo-gap').textContent=Math.ceil(Math.max(0,10-(now-last)/1000))+' sn mola payı';
  }
}
text.addEventListener('beforeinput',event=>{
  if(!event.inputType.startsWith('insert') || /Paste|Drop|Replacement/.test(event.inputType)) return;
  tick(); const now=performance.now(); if(first===null)first=now; last=now; tick();
});
text.addEventListener('input',()=>document.querySelector('#demo-words').textContent=words(text.value)+' kelime');
document.querySelector('#reset-demo').addEventListener('click',()=>{text.value='';reset();document.querySelector('#demo-words').textContent='0 kelime';text.focus();});
document.querySelectorAll('[data-demo-theme]').forEach(button=>button.addEventListener('click',()=>{
  demo.dataset.theme=button.dataset.demoTheme;
  document.querySelectorAll('[data-demo-theme]').forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));});
}));
setInterval(tick,500);
// Resolve public release assets, keeping every fallback on the real Releases page.
async function releases() {
  try {
    const response=await fetch('https://api.github.com/repos/suatatan/akis/releases/latest',{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)return;
    const release=await response.json();
    if(release.draft || release.prerelease || !Array.isArray(release.assets))return;
    const allowed = url => typeof url === 'string' && url.startsWith('https://github.com/suatatan/akis/releases/download/');
    const find=pattern=>release.assets.find(asset=>pattern.test(asset.name)&&allowed(asset.browser_download_url));
    const setup=find(/x64-setup\.exe$/i), portable=find(/x64-portable\.exe$/i), mac=find(/\.dmg$/i), linux=find(/\.AppImage$/i);
    if(setup)document.querySelectorAll('.download-windows').forEach(link=>link.href=setup.browser_download_url);
    for(const [id,asset] of [['portable-download',portable],['mac-download',mac],['linux-download',linux]])if(asset)document.getElementById(id).href=asset.browser_download_url;
    document.querySelector('#release-version').textContent='AKIŞ · '+release.tag_name;
    document.querySelector('#release-status').textContent=setup?'Windows 64 bit · Kurulum sürümü ve taşınabilir sürüm.':'Hazır paketleri GitHub sürümlerinden indirebilirsin.';
  } catch { /* The existing links remain usable when the API is unavailable. */ }
}
releases();
