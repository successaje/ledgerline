/* Ledgerline service worker: offline shell for the worker app. Records live in localStorage; chain calls are network-only. */
const VERSION = "ll-v1";
const SHELL = ["/app", "/help", "/privacy", "/manifest.json", "/brand/ledgerline-mark-192.png", "/brand/ledgerline-mark-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache chain or proof calls
  // Static assets: cache first. Pages: network first with cached fallback so a stale shell never masks a deploy.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (r.ok && e.request.mode === "navigate") caches.open(VERSION).then(c => c.put(e.request, r.clone())); return r; })
    .catch(async () => (await caches.match(e.request)) || (await caches.match("/app")) || Response.error()));
});
