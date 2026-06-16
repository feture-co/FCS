const CACHE_NAME = 'fcs-pwa-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS = ['/login', OFFLINE_URL, '/css/app.css', '/js/app.js', '/js/pwa.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL))));
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Future Co-Operative Socitey (FCS)', body: 'নতুন নোটিফিকেশন' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: data.url || '/login' } }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-deposits') event.waitUntil(Promise.resolve());
});
