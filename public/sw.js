// ============================================================================
// ePTW SYSTEM SERVICE WORKER (NETWORK-ONLY AUTH & API + OFFLINE SHELL CACHE)
// ============================================================================

const CACHE_NAME = 'eptw-system-cache-v25';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/supervisor.html',
  '/approver.html',
  '/review.html',
  '/tbm.html',
  '/manifest.json',
  '/assets/js/api.js',
  '/assets/js/db.js',
  '/assets/js/approver.js',
  '/assets/js/supervisor.js',
  '/assets/js/review.js',
  '/assets/js/tbm-portal.js',
  '/assets/js/ptw-pack.js',
  '/assets/js/ra-export.js',
  '/assets/js/signature.js',
  '/assets/js/jspdf.umd.min.js',
  '/assets/js/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Strictly network-only for all API endpoints & login gateway (never serve stale PII or auth responses)
  if (url.pathname.startsWith('/api/') || url.pathname === '/login.html' || url.pathname === '/assets/js/login.js') {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first with cache fallback for portal shells & assets
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
