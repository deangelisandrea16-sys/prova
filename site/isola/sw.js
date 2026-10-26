// Isola di Sire: funziona anche offline dopo la prima apertura.
// Pagina, codice ed elenchi (sprites.json): prima la rete (aggiornamenti subito), poi la copia salvata. Immagini e modelli: prima la copia salvata.
const C = 'sire-5206cd67';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const statico = /\.(webp|jpg|png|mp3)$/.test(u.pathname) || /assets\/kit\.json|knight|mage|rogue|deer|dragon/.test(u.pathname) || /cdnjs|jsdelivr/.test(u.host);
  if (statico) e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })));
  else if (u.origin === location.origin) e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
});
