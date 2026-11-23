// Service worker for the web build: once the game has been opened it can be played with no connection, and it can be
// installed to a home screen. (The phone apps do not use this: main.js only registers it in a browser.)
//   /assets/...   the built code, fonts and so on; their names change whenever they do, so: from the cache if there
//   everything else (the page, config, levels, face models, icons): from the network when there is one, so an update
//                 shows up straight away, and from the cache when there is not
// Bump CACHE to throw everything away on the next visit.
const CACHE = 'slapper-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

// the page says what it loaded before this worker was in charge (main.js): fetch whatever of it is not kept yet
self.addEventListener('message', (e) => {
  const list = e.data && e.data.cache; if (!Array.isArray(list)) return;
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(list.map(async (u) => {
    try { const url = new URL(u); if (url.origin !== location.origin) return; const key = url.origin + url.pathname; if (await c.match(key)) return; const r = await fetch(key); if (r.ok) await c.put(key, r); } catch { /* next time */ }
  }))));
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const key = url.origin + url.pathname;   // the config is fetched with a ?t=... to dodge the browser's cache: one copy of each
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(key)) || fetch(req).then((r) => { if (r.ok) c.put(key, r.clone()); return r; })));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    try { const r = await fetch(req); if (r.ok) c.put(key, r.clone()); return r; }
    catch (err) { const hit = await c.match(key); if (hit) return hit; throw err; }
  }));
});
