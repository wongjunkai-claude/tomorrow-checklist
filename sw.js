/* Ready for Tomorrow - service worker: offline support + auto-update */
const CACHE = 'rft-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate' || req.destination === 'document';
  if (isNav) {
    // Network-first: whenever online, the newest published version loads automatically.
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
                .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  if (url.origin === location.origin) {
    // Same-origin assets (icons, manifest): cache-first, then network.
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => r)));
  }
  // Cross-origin (e.g. public-holiday API) falls through to the network untouched.
});
