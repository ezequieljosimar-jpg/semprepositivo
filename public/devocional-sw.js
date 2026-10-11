/* Only the public offline notice is cached. No private pages, APIs or audio. */
const OFFLINE_CACHE = "devocional-offline-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add("/offline.html")).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("devocional-offline-") && key !== OFFLINE_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || new Response("Sem conexão. Tente novamente.", {status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}})));
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { return; }
  event.waitUntil(self.registration.showNotification("Seu momento com Deus", {
    body: typeof data.body === "string" ? data.body.slice(0,180) : "Separe um momento para sua leitura de hoje.",
    icon: "/icons/devocional-192.png", badge: "/icons/devocional-192.png",
    tag: "devocional-leitura", data: {url:"/devocional"}
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL("/devocional", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        await client.navigate(url); return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
