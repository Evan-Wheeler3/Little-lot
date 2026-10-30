// Offline support for the web version: serve the game from the cache, refresh it in the background.
// Bump VERSION whenever game files change so players get the update.
var VERSION = 'littlelot-1.1.3';
var FILES = ['./', 'index.html', 'style.css', 'game.js', 'auth.js', 'config.js', 'manifest.webmanifest', 'privacy.html',
  'assets/fonts/fredoka-latin-500-normal.woff2', 'assets/fonts/fredoka-latin-600-normal.woff2', 'assets/fonts/fredoka-latin-700-normal.woff2',
  'assets/fonts/nunito-latin-700-normal.woff2', 'assets/fonts/nunito-latin-800-normal.woff2',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-48.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // accounts and saves always go to the network
  e.respondWith(caches.match(e.request).then(function (hit) {
    var net = fetch(e.request).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
      return r;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
