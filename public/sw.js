const SHELL_CACHE = 'lighthouse-shell-v1';
const DATA_CACHE = 'lighthouse-data-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg'
];

// Install: precache the core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset fetch failure:', err);
      });
    })
  );
});

// Activate: purge old/stale caches and take control
self.addEventListener('activate', (event) => {
  const allowedCaches = [SHELL_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for message from client (e.g. SKIP_WAITING on user refresh)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event with intelligent routing:
// 1. Navigation requests (SPA page routes): Network-first with fallback to cached index.html
// 2. Data / API / Supabase requests: Network-first with data cache fallback
// 3. Static assets (JS, CSS, Fonts, Icons): Cache-first with network fallback & auto-caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation request (HTML SPA routes like /passes, /notices, etc.)
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback to cached page or app shell root
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const rootFallback = await caches.match('/index.html') || await caches.match('/');
          if (rootFallback) return rootFallback;
          return new Response('Offline: Unable to load Lighthouse Estate page.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Dynamic Data / Supabase / API requests: Network-first with cache fallback
  const isDataRequest = 
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('notices') ||
    url.pathname.includes('passes');

  if (isDataRequest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed (offline) -> look up in data cache or shell cache
          const cachedData = await caches.match(request);
          if (cachedData) {
            console.log('[SW] Serving cached fallback data for:', request.url);
            return cachedData;
          }
          return new Response(JSON.stringify({ offline: true, error: 'Network unavailable. Showing last synced data.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // 3. Static assets (JS, CSS, Google Fonts, SVGs, Images, Manifest): Cache-first
  const isStaticAsset =
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately; fetch in background to keep fresh if needed
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(SHELL_CACHE).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {/* Ignore background fetch errors */});
          return cachedResponse;
        }

        // Cache miss -> fetch and store
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[SW] Fetch failed for asset:', request.url, err);
          return new Response('', { status: 408, statusText: 'Request timed out / offline' });
        });
      })
    );
  }
});
