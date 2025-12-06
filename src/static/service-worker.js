const CACHE_NAME = 'memory-app-cache-v4';
const OFFLINE_ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/script.js',
  '/static/js/audio.js',
  '/static/audio/button.wav',
  '/static/audio/flip.wav',
  '/static/audio/match.wav',
  '/static/audio/music1.wav',
  '/static/audio/music2.wav',
  '/static/audio/music3.wav',
  '/static/images/logo.png',
  '/static/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        OFFLINE_ASSETS.map((asset) => cache.add(asset).catch(() => null))
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return null;
      }))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});
