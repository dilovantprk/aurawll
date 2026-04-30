const CACHE_NAME = 'aura-v54';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/translations.js',
  '/firebase.js',
  '/manifest.json',
  '/icon.svg',
  '/css/base.css',
  '/css/layout.css',
  '/css/animations.css'
];

// Dynamically cache components and services
const DYNAMIC_ASSETS = [
  '/js/core/state.js',
  '/js/core/dom.js',
  '/js/core/i18n.js',
  '/js/core/utils.js',
  '/js/core/constants.js',
  '/js/core/vagal-engine.js',
  '/js/services/auth.js',
  '/js/services/sensory.js',
  '/js/services/meditation-audio.js',
  '/js/services/insight-engine.js',
  '/js/services/notifications.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([...ASSETS, ...DYNAMIC_ASSETS]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, we already return cachedResponse if it exists
      });

      return cachedResponse || fetchPromise;
    })
  );
});
