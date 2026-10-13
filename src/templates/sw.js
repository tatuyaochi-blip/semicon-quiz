// Service Worker の元(tools/build.js が版・保存するファイルの一覧を埋めて docs/sw.js に出力する)
// ネットワークを優先し、つながらないときだけキャッシュを使う。最初の訪問時に問題データなどを保存しておく。
const CACHE = 'sq-{{version}}';
const BASE = {{base}};
const PRECACHE = {{precache}};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// 古い版のキャッシュを消す
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request)
    .then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    })
    // オフライン: 保存してあるもの(クイズ画面の ?mode=… は無視して探す)、なければトップ
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })
      .then(res => res || (e.request.mode === 'navigate' ? caches.match(BASE) : Response.error()))));
});
