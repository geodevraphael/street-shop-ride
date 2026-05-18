/* Soko alert service worker.
 * Minimal: handles notification clicks and (optionally) push events.
 * Foreground sound is played from the page itself via Web Audio.
 */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try { await client.focus(); } catch {}
          try { client.postMessage({ type: "navigate", url }); } catch {}
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Soko", body: "Una arifa mpya", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "soko-push",
      requireInteraction: true,
      data: { url: payload.url },
      vibrate: [200, 100, 200],
    }),
  );
});
