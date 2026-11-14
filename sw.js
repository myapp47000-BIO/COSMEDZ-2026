/* COSMADEDZ service worker — offline-first, cache versioned */
const VERSION = "cosmadedz-v1.5.10";
const CORE = VERSION + "-core";
const RUNTIME = VERSION + "-runtime";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/auth-api.js",
  "./js/i18n-data.js",
  "./js/i18n.js",
  "./js/app.js",
  "./js/app-pages.js",
  "./js/data-materials.js",
  "./js/data-lessons.js",
  "./js/data-recipes.js",
  "./js/data-methods.js",
  "./js/data-quizzes.js",
  "./js/data-glossary.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CORE).then(cache =>
      Promise.allSettled(APP_SHELL.map(url => cache.add(new Request(url, { cache: "reload" }))))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CORE && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API/auth traffic (also under a sub-path deployment).
  if (url.pathname.indexOf("/api/") >= 0) return;

  // Navigations: network first, fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CORE).then(c => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  // Static assets: cache first, refresh in background.
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res && res.ok) caches.open(RUNTIME).then(c => c.put(req, res)).catch(() => {});
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
          const copy = res.clone();
          caches.open(RUNTIME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
