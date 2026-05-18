/* Soko alert service worker.
 * TWA/Bubblewrap surfaces these Notification API events as Android system
 * notifications with platform sound and vibration.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function showSokoNotification(payload) {
  return self.registration.showNotification(payload.title || "Soko", {
    body: payload.body || "Una taarifa mpya kwenye Soko.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "soko-alert",
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    data: { url: payload.url || "/" },
    vibrate: payload.vibrate || [200, 100, 200],
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SOKO_SHOW_NOTIFICATION") return;
  event.waitUntil(showSokoNotification(event.data));
});

self.addEventListener("push", (event) => {
  let payload = { title: "Soko", body: "Una taarifa mpya", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed push payloads */
  }
  event.waitUntil(showSokoNotification({ ...payload, requireInteraction: true }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if ("focus" in client) {
          try {
            if ("navigate" in client) await client.navigate(targetUrl);
            else client.postMessage({ type: "navigate", url });
          } catch {
            client.postMessage({ type: "navigate", url });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })(),
  );
});
