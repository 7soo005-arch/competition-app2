/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - SERVICE WORKER (sw.js)
   ========================================================================== */

const CACHE_NAME = 'comp-app-v2';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/components.css',
    './css/admin.css',
    './js/db.js',
    './js/auth.js',
    './js/services/audit.js',
    './js/services/excel.js',
    './js/components/scoring.js',
    './js/components/leaderboard.js',
    './js/components/analytics.js',
    './js/components/admin.js',
    './js/app.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                return caches.match('./index.html');
            });
        })
    );
});
