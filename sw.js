// Service worker: keeps a copy of every app file on the phone so PersonalFit works offline.
// When any app file changes, bump VERSION. The phone downloads the new copy in the
// background and uses it the next time the app is opened.
const VERSION = 'pf-v3';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/db.js',
  'js/calc.js',
  'js/ui.js',
  'js/chart.js',
  'js/weight.js',
  'js/calories.js',
  'js/exercise.js',
  'js/fasting.js',
  'js/summary.js',
  'js/settings.js',
  'js/runplan.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first: the app opens instantly and never needs the network after the first load.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request))
  );
});
