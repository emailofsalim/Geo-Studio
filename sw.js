/* Geo Studio — Service Worker
 * Offline-first caching so the app opens with NO internet after the first visit.
 * PRIVACY: this worker only caches the app's own shell files (HTML/manifest/icons).
 * It NEVER stores, reads, or transmits the CSV/KMZ/DXF/GeoJSON files you process —
 * all of that happens in memory in your browser and is downloaded locally.
 */
const CACHE = 'geo-studio-v37';

/* Files the app needs to open with no network at all. */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-64.png',
  './icons/favicon-32.png',
  './icons/icon.svg'
];

/* The shell is served from cache first (instant, works offline) and refreshed in
   the background, so a new deploy is picked up without ever risking offline use. */
function isShell(url) {
  const here = new URL('./', self.location).pathname;
  const p = url.pathname;
  return p === here ||
         p === new URL('./index.html', self.location).pathname ||
         p === new URL('./manifest.webmanifest', self.location).pathname;
}

/* Cache every asset individually. addAll() is atomic: a single 404 used to make
   the whole precache fail, which silently left the app with NO offline support
   and stopped the worker activating at all.
   'reload' bypasses the HTTP cache so we never store a stale copy. */
async function precache() {
  const cache = await caches.open(CACHE);
  const ok = [], failed = [];
  await Promise.all(ASSETS.map(async (url) => {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
      await cache.put(url, res.clone());
      ok.push(url);
    } catch (e) {
      failed.push({ url: url, error: String((e && e.message) || e) });
    }
  }));
  return { cache: CACHE, ok: ok, failed: failed, complete: failed.length === 0 };
}

/* Which of the required assets are actually in the cache right now? */
async function status() {
  const cache = await caches.open(CACHE);
  const present = [], missing = [];
  for (const url of ASSETS) {
    const hit = await cache.match(url, { ignoreSearch: true });
    (hit ? present : missing).push(url);
  }
  return { cache: CACHE, total: ASSETS.length, present: present, missing: missing, ready: missing.length === 0 };
}

self.addEventListener('install', (event) => {
  /* never reject: a missing asset must not block activation */
  event.waitUntil(precache().catch(() => null).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Store a response without ever letting a quota error break the response chain. */
async function safePut(req, res) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(req, res);
  } catch (e) { /* quota exceeded or uncacheable — serving still works */ }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  /* Shell: stale-while-revalidate. Instant and offline-safe, but a new deploy is
     fetched in the background and used on the next load. */
  if (req.mode === 'navigate' || isShell(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') safePut(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      const fresh = await network;
      if (fresh) return fresh;
      const shell = await caches.match('./index.html', { ignoreSearch: true });
      return shell || Response.error();
    })());
    return;
  }

  /* Everything else (icons): cache-first — immutable per cache version. */
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') safePut(req, res.clone());
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});

/* The page can ask the worker to report readiness or to re-run the precache.
   Replies go back over the MessageChannel port the page supplies. */
self.addEventListener('message', (e) => {
  const data = e.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) { self.skipWaiting(); return; }
  const reply = (payload) => {
    try { if (e.ports && e.ports[0]) e.ports[0].postMessage(payload); } catch (x) { }
  };
  if (data && data.type === 'GS_STATUS') { status().then(reply).catch((err) => reply({ error: String(err) })); return; }
  if (data && data.type === 'GS_PRECACHE') {
    precache().then(status).then(reply).catch((err) => reply({ error: String(err) }));
    return;
  }
  if (data && data.type === 'GS_VERSION') { reply({ cache: CACHE, assets: ASSETS.length }); }
});
