/**
 * Service worker — Project Echo battle prototype.
 *
 * Cache-first for assets so the installed app launches offline and doesn't
 * re-download ~17MB of sprites on every open. Bump CACHE_VERSION when the
 * shell or assets change, or installed clients will keep serving the old copy.
 */

const CACHE_VERSION = "echo-v2";

/* The shell is precached; character art is cached lazily on first request so
   install stays fast rather than blocking on every sprite. */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/battle-ui.css",
  "./src/battle-ui.js",
  "./src/engine-adapter.js",
  "./src/combat.js",
  "./src/units.js",
  "./src/data.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // only cache same-origin successes
        if (!res || res.status !== 200 || res.type !== "basic") return res;
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
