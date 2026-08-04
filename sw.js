const CACHE_NAME = "mtsv-post-generator-v2";
const APP_SHELL = [
  "index.html",
  "trainer.html",
  "styles.css",
  "config.js",
  "manifest.json",
  "js/gate.js",
  "js/supabase-client.js",
  "js/db.js",
  "js/caption.js",
  "js/renderer.js",
  "js/app-index.js",
  "js/app-trainer.js",
  "assets/mtsv-logo.png",
  "assets/pohl-logo.png",
  "assets/jersey-bg.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Netzwerk-Anfragen an Supabase (Daten/Storage) immer live holen, nie aus dem Cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method === "GET" && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
