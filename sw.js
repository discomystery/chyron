// Keeps Chyron working offline once installed.
// App files: try the network first so updates arrive, fall back to the saved copy.
// Fonts and the speech engine's files: use the saved copy first, since they never change.
// (The speech model itself is kept by transformers.js in its own cache.)
const CACHE = 'chyron-v3';
const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'icons.js',
  'vendor/mediabunny.min.js',
  'caption-worker.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net', 'p.typekit.net', 'cdn.jsdelivr.net'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  // Ask the server each time rather than the browser's own cache, which GitHub Pages lets keep a file for
  // ten minutes, so an update never arrives half old and half new.
  event.respondWith(
    fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
