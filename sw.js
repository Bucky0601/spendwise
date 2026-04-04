var CACHE = 'spendwise-v1';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.log('SW install cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  // Skip API calls entirely - always go to network
  if (url.pathname.indexOf('/api/') === 0 || url.hostname.indexOf('api.') !== -1) {
    return;
  }
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(function(resp) {
      return resp || fetch(e.request).then(function(networkResp) {
        if (networkResp.status === 200) {
          var clone = networkResp.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return networkResp;
      });
    }).catch(function() {
      // Fallback for navigation requests
      if (e.request.headers.get('accept').indexOf('text/html') !== -1) {
        return caches.match('/index.html');
      }
    })
  );
});
