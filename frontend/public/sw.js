/* NurtureHer AI service worker.
 *
 * Scope is intentionally conservative: it caches the app shell and static
 * build assets so the interface loads offline, but it NEVER caches API
 * responses. Health records, chat, facility search and analytics always
 * require a live network connection, and the app surfaces an explicit
 * offline state instead of showing stale clinical data.
 *
 * The precache list (hashed build asset URLs + a build version) is emitted at
 * build time by the `nurtureher-pwa-precache` Vite plugin into
 * `/sw-precache.js`, which is imported below.
 */
importScripts("/sw-precache.js");

const CACHE_NAME = `nurtureher-shell-${self.__NH_BUILD_VERSION__ || "dev"}`;
const PRECACHE_URLS = Array.isArray(self.__NH_PRECACHE__) ? self.__NH_PRECACHE__ : ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: "reload" })));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("nurtureher-shell-") && k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/** Never let the service worker touch API or auth traffic. */
function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isApiRequest(url)) return;

  // SPA navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put("/index.html", fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first with a background refresh.
  if (url.pathname.startsWith("/assets/") || /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          fetch(request)
            .then((res) => {
              if (res && res.ok) cache.put(request, res.clone());
            })
            .catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })(),
    );
  }
});
