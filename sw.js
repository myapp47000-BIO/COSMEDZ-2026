/* COSMADEDZ service worker — offline-first, cache versioned */
const VERSION = "cosmadedz-v1.5.13";
const BUILD = "1.5.13";
const CORE = VERSION + "-core";
const RUNTIME = VERSION + "-runtime";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css?v=" + BUILD,
  "./js/boot-guard.js?v=" + BUILD,
  "./js/auth-api.js?v=" + BUILD,
  "./js/i18n-data.js?v=" + BUILD,
  "./js/i18n.js?v=" + BUILD,
  "./js/app.js?v=" + BUILD,
  "./js/app-pages.js?v=" + BUILD,
  "./js/data-materials.js?v=" + BUILD,
  "./js/data-lessons.js?v=" + BUILD,
  "./js/data-recipes.js?v=" + BUILD,
  "./js/data-methods.js?v=" + BUILD,
  "./js/data-quizzes.js?v=" + BUILD,
  "./js/data-glossary.js?v=" + BUILD,
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
    ).then(() => {
      // A previous worker means this is an update, not a first install:
      // activate right away so nobody stays on an old cached shell.
      if (self.registration.active) return self.skipWaiting();
    })
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
      }).catch(() => new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});
