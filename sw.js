/* Ready for Tomorrow - service worker: offline support + reliable auto-update */
const CACHE = 'rft-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate' || req.destination === 'document';

  if (isNav) {
    // Network-first, and explicitly BYPASS the browser's HTTP cache so a stale
    // GitHub Pages copy (Cache-Control: max-age=600) can't be served back to us.
    e.respondWith(
      fetch(new Request('./index.html', { cache: 'reload' }))
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  if (url.origin === location.origin) {
    // Same-origin assets: serve fast from cache, but refresh in the background.
    e.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
  // Cross-origin (e.g. the public-holiday API) passes straight through.
});
