/* MicroFoundry offline support.
   Bump VERSION whenever you publish changes so phones pick up the new files. */
const VERSION = "mf-v5";
const TOOLS = ["QuickCounter","PulseCounter","AutoFormatter","AutoWriter","MicroNote","TimeStampTool","MicroTimer","Decider"];
const FILES = [
  "./", "manifest.webmanifest",
  "assets/mf.css", "assets/mf.js", "assets/logo.png",
  "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png",
  "index.html", ...TOOLS.map(t => t + "/index.html"), "Pricing/index.html", "ThankYou/index.html"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages: try the network first so updates show up, fall back to the saved copy offline.
// Everything else: use the saved copy first, then refresh it in the background.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(req.url);
  if (!sameOrigin && !isFont) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
