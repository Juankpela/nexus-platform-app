// Minimal service worker — required for PWA installability.
// Intentionally a network passthrough: no offline caching yet (that is FWX-3,
// where we add IndexedDB + an outbox). Keeping it trivial avoids serving stale
// app shells during active development.
self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  // Pass through to the network. Presence of a fetch handler is what makes the
  // app installable; we deliberately do not cache responses here.
  event.respondWith(fetch(event.request))
})
