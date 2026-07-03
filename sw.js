import { APP_VERSION } from './src/version.js';

const CACHE_NAME = `bubblepop-${APP_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './src/style.css',
  './src/main.js',
  './src/game.js',
  './src/levelmap.js',
  './src/levels.js',
  './src/progress.js',
  './src/identity.js',
  './src/progress-sync.js',
  './src/leaderboard-ui.js',
  './src/leaderboard.js',
  './src/howto-ui.js',
  './src/version.js',
  './src/firebase-config.js',
  './src/firebase.js',
  './src/sound-pref.js',
];

const GOOGLE_FONTS_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NO_CACHE_HOSTS = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (NO_CACHE_HOSTS.includes(url.hostname)) {
    return; // always network, never cached — leaderboard/auth must stay live
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (GOOGLE_FONTS_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else (e.g. Firebase CDN JS): let the browser handle it natively.
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put('./', response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match('./');
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkFetch) || Response.error();
}
