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
  // El SW existe solo para instalabilidad PWA (sin caché). Para no poder romper
  // nada, NO interceptamos navegaciones, POST ni autenticación ni cross-origin:
  // esas las maneja el navegador de forma nativa. Solo dejamos pasar GET de
  // assets del mismo origen (con catch, para que un fallo de red nunca rechace
  // el FetchEvent). [Fix: respondWith(fetch(POST /login)) rompía el inicio de sesión.]
  const req = event.request
  if (req.method !== "GET" || req.mode === "navigate") return
  if (new URL(req.url).origin !== self.location.origin) return
  event.respondWith(fetch(req).catch(() => Response.error()))
})
