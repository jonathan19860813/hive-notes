/* Hive Notes service worker */
const VERSION = 'hive-notes-v32';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon.svg', './Hive-Notes-Install-Guide.pdf', './Hive-Notes-Microphone-Guide.pdf'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hive-notes-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET') return;
  // pinned offline-dictation library files (Transformers.js / ONNX Runtime) from jsDelivr: cache-first, kept across app updates
  if (u.origin === 'https://cdn.jsdelivr.net' && /\/npm\/(@huggingface\/transformers|onnxruntime-web)@\d/.test(u.pathname)) {
    e.respondWith(caches.open('hn-lib-v1').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  // everything else cross-origin (model files are cached by Transformers.js itself) is left alone
  if (u.origin !== location.origin) return;
  // test/prototype pages (e.g. picker-test.html) are never cached or served from cache
  if (/\/[^/]*-test\.html$/.test(u.pathname)) return;
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
