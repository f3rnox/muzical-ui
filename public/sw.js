// Muzical Service Worker
// Provides offline support by caching the app shell and static assets.
// Local library playback (via File System Access + object URLs) works without network.
// External features (YouTube, lyrics APIs, MusicBrainz searches) require connectivity.

const CACHE_NAME = 'muzical-v1';
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {
        /* non-fatal if some shell assets unavailable during install */
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests. Let YouTube, Genius, Last.fm, MusicBrainz, etc. go to the network.
  if (url.origin !== self.location.origin) return;

  // Never cache or intercept API routes (they are dynamic / require auth / real-time).
  if (url.pathname.startsWith('/api/')) return;

  // For full page navigations: try network first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // For static assets (_next static chunks, CSS, fonts, public files, etc.):
  // Cache-first, with background revalidation. Falls back to cache when offline.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Promise.reject(new Error('Offline and no cache')));

      return cachedResponse || networkFetch;
    })
  );
});
