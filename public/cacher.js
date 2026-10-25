// The old Gravit Designer registered service workers as /cacher.js and
// /service-worker.js on gravitdesign.com. They kept serving its precached
// index.html and stylesheets after the new app took over the domain.
// The browser checks for a new version on the next visit and installs
// this one, which clears the old caches, removes itself and reloads the
// open tabs.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" }))
        client.navigate(client.url);
    })(),
  );
});
