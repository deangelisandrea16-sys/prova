/* Regno di Sire — service worker: avvio veloce e funzionamento offline.
   Pagina: rete prima (così gli aggiornamenti arrivano), cache se offline.
   Modelli, audio, librerie: cache prima (non cambiano spesso). */
const VERSION='sire-v2';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/kit.json','./assets/Knight.json','./assets/Mage.json','./assets/Rogue_Hooded.json','./assets/Barbarian.json','./assets/coro.mp3','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url),isPage=req.mode==='navigate'||url.pathname.endsWith('/index.html');
  if(isPage){e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp));return r}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));return}
  const cacheable=url.origin===location.origin||/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if(!cacheable)return;
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==='opaque'){const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp))}return r})));
});
