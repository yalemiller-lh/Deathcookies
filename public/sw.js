// Service worker: keeps the app opening offline, and shows reminder pushes.
const CACHE = 'deathcookies-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/badge-72.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Firebase sign-in pages must always come from the network.
  if (url.origin === self.location.origin && url.pathname.startsWith('/__/')) return;

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, '/'));
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request)); // hashed build files never change
  } else if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
  // Everything else (the database, sign-in) goes straight to the network.
});

self.addEventListener('push', event => {
  let message = { title: 'Deathcookies', body: '' };
  try { message = { ...message, ...event.data.json() }; } catch { /* no or non-JSON payload */ }
  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'daily-reminder',
    data: { url: '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find(w => new URL(w.url).origin === self.location.origin);
    if (open) return open.focus();
    return self.clients.openWindow('/');
  })());
});
