/* Carnet de tables — consultation hors connexion.
   La page et ses fichiers : réseau d'abord (on veut toujours la dernière version),
   cache en secours. Polices et Leaflet : cache d'abord, ils ne changent pas.
   L'API GitHub, la recherche d'adresses et les fonds de carte ne sont jamais mis en cache. */
const CACHE = "tables-v1";
const COQUILLE = ["./", "index.html", "manifest.json", "icon.svg", "icon-maskable.svg"];
const STATIQUES = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (STATIQUES.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copie = res.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;   // API GitHub, Photon, tuiles : réseau seul

  e.respondWith(fetch(req, {cache: "no-store"}).then(res => {
    if (res.ok) { const copie = res.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
    return res;
  }).catch(() => caches.match(req, {ignoreSearch: true})
    .then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined))
    .then(hit => hit || new Response("Hors connexion", {status: 503}))));
});
