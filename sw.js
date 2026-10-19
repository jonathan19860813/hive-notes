/* Hive Notes service worker */
const VERSION = 'hive-notes-v34';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon.svg', './Hive-Notes-Install-Guide.pdf'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('hive-notes-') && k !== VERSION) || k === 'hn-lib-v1' || k === 'transformers-cache').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET') return;
  // cross-origin requests are left alone
  if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // network first for pages so updates arrive; fall back to cached shell offline
    const isShell = /\/(index\.html)?$/.test(u.pathname);
    e.respondWith(fetch(req).then(r => { if (r.ok && isShell) { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); } return r; })
      .catch(() => caches.match('./index.html', {ignoreSearch: true}).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  })));
});
