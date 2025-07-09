// service-worker.js – versione VERY simple, adatta a GitHub Pages
const CACHE_NAME_STATIC = 'pkgame-static-v1';
const CACHE_ASSETS = [
  '/',                   // pagina principale
  '/index.html',         // se esiste
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ➜ 1. Install: precache asset di base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then(cache => cache.addAll(CACHE_ASSETS))
  );
  self.skipWaiting();      // forza l’attivazione immediata
});

// ➜ 2. Activate: pulizia vecchi cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME_STATIC)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ➜ 3. Fetch: network-first con fallback a cache/offline
self.addEventListener('fetch', event => {
  // Solo richieste GET e stesse origini
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request, { cache: 'no-store' });
        // Clona e aggiorna cache in background
        const cache = await caches.open(CACHE_NAME_STATIC);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // Offline → prova cache, altrimenti offline.html
        const cached = await caches.match(event.request);
        return cached || caches.match('/offline.html');
      }
    })()
  );
});
