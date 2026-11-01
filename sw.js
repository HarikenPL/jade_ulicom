'use strict';
// Przechowuje wyłącznie pliki panelu; nie obsługuje komend autka.
const BASE = new URL('./', self.location.href);
const PREFIX = 'rover-panel:' + BASE.href + ':';
const CACHE = PREFIX + '0.10.0-r8ab1c1abfdaeeb4';
const INDEX = new URL('index.html', BASE).href;
const FILES = ['index.html', 'manifest.webmanifest', 'icons/rover-192.png', 'icons/rover-512.png', 'assets/rover-mark.webp']
  .map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(FILES.map(url => new Request(url, {cache: 'reload'})))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE.origin) return;
  const isPanel = event.request.mode === 'navigate' &&
    (url.pathname === BASE.pathname || url.pathname === new URL(INDEX).pathname);
  const fileURL = url.origin + url.pathname;
  if (!isPanel && !FILES.includes(fileURL)) return;
  const key = isPanel ? INDEX : fileURL;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('Panel unavailable');
      try { await cache.put(key, response.clone()); } catch (_) {}
      return response;
    } catch (_) {
      return await cache.match(key) || new Response('Połącz z internetem i odśwież panel Rover.', {
        status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
      });
    }
  })());
});

// Nowa wersja przejmuje obsługę dopiero po wybraniu aktualizacji.
self.addEventListener('message', event => {
  if (event.data?.type === 'ROVER_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
