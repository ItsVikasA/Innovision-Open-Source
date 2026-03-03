// Service Worker for Offline Support with Background Sync
const CACHE_NAME = 'innovision-v2';
const urlsToCache = [
  '/',
  '/roadmap',
  '/profile',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Don't cache API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached response and update cache in background
          fetch(event.request).then((freshResponse) => {
            if (freshResponse && freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, freshResponse);
              });
            }
          }).catch(() => {});
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
      .catch(() => {
        return caches.match('/offline.html');
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Background Sync — triggered when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncOfflineProgress());
  }
});

/**
 * Background sync: read unsynced progress from IndexedDB and POST to server.
 * Uses the same IndexedDB structure as the client-side offline.js.
 */
async function syncOfflineProgress() {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction('progress', 'readonly');
    const index = tx.objectStore('progress').index('synced');
    const request = index.getAll(0);

    const unsyncedItems = await idbRequestToPromise(request);
    await tx.done;

    if (!unsyncedItems || unsyncedItems.length === 0) return;

    // Group by courseId
    const grouped = {};
    for (const item of unsyncedItems) {
      const key = item.courseId;
      if (!key) continue;
      if (!grouped[key]) {
        grouped[key] = { courseId: item.courseId, courseType: item.courseType || 'roadmap', chapters: {}, ids: [] };
      }
      const chapterKey = item.chapter || item.chapterKey || 'unknown';
      grouped[key].chapters[chapterKey] = {
        completed: item.completed || false,
        completedAt: item.timestamp || Date.now(),
        timeSpent: item.timeSpent || 0,
      };
      grouped[key].ids.push(item.id);
    }

    for (const [, group] of Object.entries(grouped)) {
      try {
        const response = await fetch('/api/progress/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: group.courseId,
            courseType: group.courseType,
            chapters: group.chapters,
            clientTimestamp: Date.now(),
          }),
        });

        if (response.ok) {
          // Mark synced
          const writeTx = db.transaction('progress', 'readwrite');
          const store = writeTx.objectStore('progress');
          for (const id of group.ids) {
            const record = await idbRequestToPromise(store.get(id));
            if (record) {
              record.synced = 1;
              store.put(record);
            }
          }
          await writeTx.done;
        }
      } catch {
        // Will retry on next sync event
      }
    }
  } catch (error) {
    console.warn('Background sync failed:', error);
  }
}

/**
 * Open IndexedDB from within the service worker (no idb library here)
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('InnoVisionOffline', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      // Let the main thread handle upgrades
    };
  });
}

/**
 * Convert IDBRequest to a promise
 */
function idbRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    if (request.readyState === 'done') {
      resolve(request.result);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
