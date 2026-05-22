// Minimal installable Service Worker for Kanz Educational Platform
const CACHE_NAME = 'kanz-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip audio proxy or range request files to let browser handle native streaming (Range 206)
  if (url.pathname.includes('/api/proxy-audio') || event.request.destination === 'audio' || event.request.destination === 'video') {
    return;
  }
  
  // Prefer cached icons (which are dynamically generated from the crisp SVG)
  if (url.pathname === '/icon.png' || url.pathname === '/apple-touch-icon.png') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Network-first pattern to allow prompt web updates instantly without caching block
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
