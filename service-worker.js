const CACHE = "workout-v96";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/release-notes.js",
  "./js/storage.js",
  "./js/lib/dates.js",
  "./js/lib/units.js",
  "./manifest.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];

// Firebase origins must go through the network so auth tokens stay fresh.
const FIREBASE_ORIGINS = [
  "https://www.gstatic.com",
  "https://firestore.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://firebase.googleapis.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: "SW_UPDATED" }),
          );
        }),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first for Firebase; cache-first for everything else.
self.addEventListener("fetch", (event) => {
  if (FIREBASE_ORIGINS.some((o) => event.request.url.startsWith(o))) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
    return;
  }
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
