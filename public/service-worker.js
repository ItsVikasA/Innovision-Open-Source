// ============================================================
// InnoVision Service Worker - Enhanced Offline Support
// ============================================================
// Features:
// - Dynamic route caching for all app pages
// - Intelligent API response caching (Stale-While-Revalidate)
// - Versioning system for automatic cache updates
// - Comprehensive error handling and logging
// - Context-aware offline fallbacks
// - Cache size management
// ============================================================

// Cache version - increment this to force all users to update cache
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `innovision-v${CACHE_VERSION}`;

// Cache types for different strategies
const CACHE_TYPES = {
  STATIC: `${CACHE_NAME}-static`,      // For static assets (JS, CSS, images)
  DYNAMIC: `${CACHE_NAME}-dynamic`,    // For HTML pages
  API: `${CACHE_NAME}-api`,             // For API responses
  IMAGES: `${CACHE_NAME}-images`,       // For image caching
};

// URLs to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/offline.html',
  '/manifest.json',
];

// App routes that should be cached
const APP_ROUTES = [
  '/',
  '/roadmap',
  '/profile',
  '/gamification',
  '/studio',
  '/features',
  '/features/offline',
  '/features/analytics',
  '/features/multimodal',
  '/features/personalization',
  '/features/lms',
  '/generate',
  '/premium',
  '/dashboard',
];

// API endpoints to cache with different strategies
const API_ROUTES = {
  'stale-while-revalidate': [
    '/api/roadmap/all',
    '/api/gamification/leaderboard',
    '/api/gamification/stats',
  ],
  'cache-first': [
    '/api/premium/status',
  ],
  'network-first': [
    '/api/progress/sync',
    '/api/user/profile',
  ],
};

// Routes that should NOT be cached
const NO_CACHE_ROUTES = [
  '/api/auth',
  '/api/login',
  '/api/logout',
];

// Image types to cache
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

// Cache size limits (in number of entries)
const CACHE_LIMITS = {
  dynamic: 50,
  api: 100,
  images: 100,
};

// ============================================================
// INSTALL EVENT - Pre-cache essential assets
// ============================================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing Service Worker v${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(CACHE_TYPES.STATIC);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached successfully');

        // Pre-cache app routes (don't fail if one fails)
        const dynamicCache = await caches.open(CACHE_TYPES.DYNAMIC);
        for (const route of APP_ROUTES) {
          try {
            const response = await fetch(route);
            if (response.ok) {
              await dynamicCache.put(route, response);
            }
          } catch (error) {
            console.warn(`[SW] Failed to pre-cache route: ${route}`, error);
          }
        }
        console.log('[SW] App routes cached');

        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
    })()
  );
});

// ============================================================
// ACTIVATE EVENT - Clean up old caches and update to new version
// ============================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating Service Worker v${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        
        // Delete old cache versions
        const cachesToDelete = cacheNames.filter((cacheName) => {
          // Keep only current version caches
          const isCurrentVersion = Object.values(CACHE_TYPES).some(
            (type) => cacheName === type
          );
          return !isCurrentVersion;
        });

        await Promise.all(
          cachesToDelete.map((cacheName) => {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );

        console.log('[SW] Cache cleanup completed');

        // Claim all clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              version: CACHE_VERSION,
            });
          });
        });
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );

  self.clients.claim();
});

// ============================================================
// FETCH EVENT - Intelligent caching based on request type
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip chrome extensions and non-http requests
  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    return;
  }

  // Skip auth and sensitive routes
  if (NO_CACHE_ROUTES.some((route) => pathname.startsWith(route))) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests
  if (pathname.startsWith('/api/')) {
    return event.respondWith(handleAPIRequest(request));
  }

  // Handle image requests
  if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return event.respondWith(handleImageRequest(request));
  }

  // Handle page requests
  if (request.method === 'GET') {
    return event.respondWith(handlePageRequest(request));
  }

  // Default: network only for non-GET requests
  event.respondWith(fetch(request));
});

// ============================================================
// HELPER: Handle API Requests
// ============================================================
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Network first strategy (for most APIs)
    if (API_ROUTES['network-first'].some((route) => pathname.includes(route))) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          // Cache successful responses
          const cacheName = CACHE_TYPES.API;
          const cache = await caches.open(cacheName);
          cache.put(request, response.clone());
          
          // Enforce cache limits
          await enforceCacheLimit(cacheName, CACHE_LIMITS.api);
        }
        return response;
      } catch (error) {
        console.warn('[SW] Network failed, trying cache:', error);
        return caches.match(request) || createOfflineResponse('api');
      }
    }

    // Stale-While-Revalidate strategy (for frequently accessed APIs)
    if (API_ROUTES['stale-while-revalidate'].some((route) => pathname.includes(route))) {
      const cache = await caches.open(CACHE_TYPES.API);
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          cache.put(request, responseToCache);
          
          // Enforce cache limits
          enforceCacheLimit(CACHE_TYPES.API, CACHE_LIMITS.api);
          
          // Notify clients of update
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'API_UPDATED',
                url: pathname,
              });
            });
          });
        }
        return response;
      }).catch((error) => {
        console.warn('[SW] Fetch failed for stale-while-revalidate:', error);
        return cachedResponse || createOfflineResponse('api');
      });

      return cachedResponse || fetchPromise;
    }

    // Cache-first strategy (for stable APIs like premium status)
    if (API_ROUTES['cache-first'].some((route) => pathname.includes(route))) {
      const cache = await caches.open(CACHE_TYPES.API);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
          await enforceCacheLimit(CACHE_TYPES.API, CACHE_LIMITS.api);
        }
        return response;
      } catch (error) {
        console.warn('[SW] Cache and network failed:', error);
        return createOfflineResponse('api');
      }
    }

    // Default: Network only for unknown APIs
    return fetch(request);
  } catch (error) {
    console.error('[SW] API request error:', error);
    return createOfflineResponse('api');
  }
}

// ============================================================
// HELPER: Handle Image Requests
// ============================================================
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(CACHE_TYPES.IMAGES);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);
    
    if (response.ok) {
      const responseToCache = response.clone();
      cache.put(request, responseToCache);
      
      // Enforce cache limits
      await enforceCacheLimit(CACHE_TYPES.IMAGES, CACHE_LIMITS.images);
    }

    return response;
  } catch (error) {
    console.warn('[SW] Image fetch failed:', error);
    // Return a placeholder or cached fallback
    return caches.match('/offline.html');
  }
}

// ============================================================
// HELPER: Handle Page Requests
// ============================================================
async function handlePageRequest(request) {
  try {
    const cache = await caches.open(CACHE_TYPES.DYNAMIC);
    
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        // Cache successful page responses
        const responseToCache = response.clone();
        cache.put(request, responseToCache);
        
        // Enforce cache limits
        await enforceCacheLimit(CACHE_TYPES.DYNAMIC, CACHE_LIMITS.dynamic);
      }
      
      return response;
    } catch (error) {
      console.warn('[SW] Network request failed, trying cache:', error);
      
      // Try to return cached version
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return context-aware offline page
      return createOfflineResponse('page', request.url);
    }
  } catch (error) {
    console.error('[SW] Page request error:', error);
    return createOfflineResponse('page', request.url);
  }
}

// ============================================================
// HELPER: Enforce Cache Size Limits
// ============================================================
async function enforceCacheLimit(cacheName, limit) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > limit) {
      // Delete oldest entries (FIFO)
      const keysToDelete = keys.slice(0, keys.length - limit);
      
      for (const key of keysToDelete) {
        await cache.delete(key);
        console.log(`[SW] Removed from cache due to limit: ${key.url}`);
      }
    }
  } catch (error) {
    console.error('[SW] Cache limit enforcement failed:', error);
  }
}

// ============================================================
// HELPER: Create Context-Aware Offline Responses
// ============================================================
function createOfflineResponse(type, url = '') {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InnoVision - Offline Mode</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        
        .offline-container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .offline-icon {
          font-size: 60px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        h1 {
          color: #667eea;
          margin-bottom: 10px;
          font-size: 28px;
        }
        
        .message {
          color: #666;
          margin-bottom: 20px;
          line-height: 1.6;
          font-size: 16px;
        }
        
        .details {
          background: #f5f5f5;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 20px 0;
          text-align: left;
          border-radius: 4px;
          font-size: 14px;
          color: #666;
        }
        
        .details-title {
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }
        
        .actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          flex-direction: column;
        }
        
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .btn-primary {
          background: #667eea;
          color: white;
        }
        
        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
        }
        
        .btn-secondary:hover {
          background: #e8e8e8;
        }
        
        .tips {
          background: #e8f4f8;
          border-radius: 6px;
          padding: 15px;
          margin-top: 20px;
          font-size: 13px;
          color: #0c5460;
          line-height: 1.6;
        }
        
        .tips-title {
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .tips ul {
          list-style: none;
          text-align: left;
        }
        
        .tips li {
          padding: 4px 0;
          padding-left: 20px;
          position: relative;
        }
        
        .tips li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #0c5460;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        
        <h1>You're Offline</h1>
        
        <div class="message">
          ${
            type === 'api'
              ? 'Unable to fetch data from the server. Check your connection and try again.'
              : 'The page you requested is not available in offline mode. Please check your connection and try again.'
          }
        </div>
        
        <div class="details">
          <div class="details-title">Request Information</div>
          <div>Type: ${type.toUpperCase()}</div>
          <div>URL: ${url ? new URL(url, location.origin).pathname : 'N/A'}</div>
          <div>Status: No internet connection</div>
        </div>
        
        <div class="actions">
          <button class="btn-primary" onclick="location.reload()">
            Retry Now
          </button>
          <button class="btn-secondary" onclick="goHome()">
            Go to Home
          </button>
        </div>
        
        <div class="tips">
          <div class="tips-title">💡 What you can do:</div>
          <ul>
            <li>Check your internet connection</li>
            <li>Try accessing from a cached page (/, /roadmap, /profile)</li>
            <li>Download courses for offline access in premium</li>
            <li>Wait for connection and retry</li>
          </ul>
        </div>
      </div>
      
      <script>
        function goHome() {
          location.href = '/';
        }
        
        // Listen for online event
        window.addEventListener('online', () => {
          location.reload();
        });
      </script>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// ============================================================
// MESSAGE HANDLER - Handle messages from clients
// ============================================================
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'CLEAR_CACHE') {
    handleClearCache(payload);
  } else if (type === 'CACHE_STATUS') {
    handleCacheStatus(event.ports[0]);
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle cache clearing
async function handleClearCache(payload) {
  try {
    const cacheNames = await caches.keys();
    
    if (payload.type === 'all') {
      // Clear all caches
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('[SW] All caches cleared');
    } else if (payload.type === 'specific') {
      // Clear specific cache types
      const cachesToClear = cacheNames.filter((name) =>
        payload.cacheTypes.some((type) => name.includes(type))
      );
      await Promise.all(cachesToClear.map((name) => caches.delete(name)));
      console.log('[SW] Specific caches cleared:', cachesToClear);
    }

    // Notify client
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_CLEARED',
          payload,
        });
      });
    });
  } catch (error) {
    console.error('[SW] Cache clear failed:', error);
  }
}

// Handle cache status check
async function handleCacheStatus(port) {
  try {
    const cacheNames = await caches.keys();
    const cacheStats = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheStats[cacheName] = {
        count: keys.length,
        urls: keys.map((k) => k.url),
      };
    }

    port.postMessage({
      type: 'CACHE_STATUS',
      data: {
        caches: cacheStats,
        version: CACHE_VERSION,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('[SW] Cache status check failed:', error);
    port.postMessage({
      type: 'ERROR',
      error: error.message,
    });
  }
}

console.log(`[SW] Service Worker v${CACHE_VERSION} loaded`);
