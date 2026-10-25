/* Only public, fixed assets enter Cache Storage. No API, document or draft caching. */
const CACHE = 'jobmatch-public-v1';
const ASSETS = ['/offline.html', '/icon.svg', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path, {credentials: 'omit', cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jobmatch-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(request, {credentials: 'omit', cache: 'no-store'})));
    return;
  }
  if (request.mode === 'navigate' && url.pathname === '/') {
    // Never store the response: even a successful document may be personalized later.
    event.respondWith(fetch(request, {cache: 'no-store'}).catch(async () => {
      let cached;
      try { cached = await (await caches.open(CACHE)).match('/offline.html'); } catch { /* Storage may have been evicted or disabled. */ }
      return cached || new Response('Нет подключения. Подключитесь к интернету и повторите загрузку.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'}});
    }));
  }
});
