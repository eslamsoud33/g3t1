// دمج إشعارات OneSignal مع Service Worker الخاص بنا
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Minimal installable Service Worker for Kanz Educational Platform
const CACHE_NAME = 'kanz-cache-v3'; // تم تغيير الرقم إلى 3 لتحديث كاش الأيقونات للطلاب

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip audio proxy or range request files to let browser handle native streaming (Range 206)
  if (url.pathname.includes('/api/proxy-audio') || event.request.destination === 'audio' || event.request.destination === 'video') {
    return;
  }
  
  // Prefer cached icons (which are dynamically generated from the crisp SVG)
  if (url.pathname.endsWith('/icon.png') || url.pathname.endsWith('/apple-touch-icon.png')) {
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
