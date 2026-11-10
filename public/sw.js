/* MasterBot Chess — offline-first service worker.
 * The whole game (engine, book, UI) is already 100% local; this makes the
 * site installable and keeps it working with zero network after first load. */

const CACHE = "masterbot-chess-v2";
const CORE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/chess-worker.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch other origins
  if (url.pathname === "/sw.js") return;

  // The engine worker and the manifest are versioned/protocol-carrying files:
  // serve them network-first so an app update ALWAYS takes effect. (A previous
  // cache-first policy here once stranded players on a stale worker that
  // silently ignored new messages — e.g. a dead hint button.)
  if (url.pathname === "/chess-worker.js" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  const isDocument =
    req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isDocument) {
    // network-first for the shell, cache fallback keeps the game playable offline
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then((m) => m || caches.match("/"))
        )
    );
    return;
  }

  // cache-first for build assets (hashed filenames make them immutable)
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit)
    )
  );
});
