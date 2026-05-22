/**
 * Innovision PWA Service Worker v2
 * Implements dynamic versioning, stale-while-revalidate for active API paths,
 * and cache-first for static dependencies.
 */

const CACHE_NAME = 'innovision-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/gamification',
  '/studio',
  '/features',
  '/favicon.ico',
];

/**
 * Install event: Precaching static routing elements and assets.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching initial assets...');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

/**
 * Activate event: Sweep and delete outdated cache pools.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[Service Worker] Sweeping outdated cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch event: Intercept network requests.
 * Uses Stale-While-Revalidate for APIs and Cache-First for structural static dependencies.
 */
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip cross-origin requests unless explicitly handled
  if (requestUrl.origin !== location.origin) {
    return;
  }

  // 1. Stale-While-Revalidate for API paths
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Update cache silently with fresh response
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Handle offline API fetch gracefully if possible
            console.warn('[Service Worker] API fetch failed, relying on cache if available.');
          });

          // Return cached response immediately if present, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Cache-First for static assets (JS, CSS, Images, Fonts)
  const isStaticAsset = requestUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/i);
  if (isStaticAsset || PRECACHE_ASSETS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Only cache valid responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network-First for HTML navigation and everything else
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for document requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      });
    })
  );
});
