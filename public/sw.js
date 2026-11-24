// Service worker minimal : rend l'app installable et affiche une page hors-ligne simple.
const OFFLINE = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:system-ui;background:#eceae4;display:grid;place-items:center;height:100vh;margin:0'><div style='text-align:center'><h1>Pas de réseau</h1><p>Reconnecte-toi pour voir ton classement.</p></div>";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
