// Service Worker の元(tools/build.js が版・保存するファイルの一覧を埋めて docs/sw.js に出力する)
// ネットワークを優先し、つながらないときだけキャッシュを使う。最初の訪問時に問題データなどを保存しておく。
const CACHE = 'sq-47c75dc23c';
const BASE = "/semicon-quiz/";
const PRECACHE = [
  "/semicon-quiz/",
  "/semicon-quiz/quiz/",
  "/semicon-quiz/stats/",
  "/semicon-quiz/manifest.json",
  "/semicon-quiz/data/ja/index.json",
  "/semicon-quiz/data/ja/q/adc-dac.json",
  "/semicon-quiz/data/ja/q/advanced-packaging.json",
  "/semicon-quiz/data/ja/q/analog.json",
  "/semicon-quiz/data/ja/q/bjt.json",
  "/semicon-quiz/data/ja/q/cleanroom.json",
  "/semicon-quiz/data/ja/q/cmp-cleaning.json",
  "/semicon-quiz/data/ja/q/compound.json",
  "/semicon-quiz/data/ja/q/cpu.json",
  "/semicon-quiz/data/ja/q/deposition.json",
  "/semicon-quiz/data/ja/q/dram.json",
  "/semicon-quiz/data/ja/q/eda.json",
  "/semicon-quiz/data/ja/q/ehs.json",
  "/semicon-quiz/data/ja/q/emerging-memory.json",
  "/semicon-quiz/data/ja/q/epitaxy.json",
  "/semicon-quiz/data/ja/q/etching.json",
  "/semicon-quiz/data/ja/q/finfet.json",
  "/semicon-quiz/data/ja/q/image-sensor.json",
  "/semicon-quiz/data/ja/q/industry.json",
  "/semicon-quiz/data/ja/q/interconnect.json",
  "/semicon-quiz/data/ja/q/ion-implant.json",
  "/semicon-quiz/data/ja/q/lithography.json",
  "/semicon-quiz/data/ja/q/logic.json",
  "/semicon-quiz/data/ja/q/mems-sensor.json",
  "/semicon-quiz/data/ja/q/metrology.json",
  "/semicon-quiz/data/ja/q/mosfet.json",
  "/semicon-quiz/data/ja/q/oxidation.json",
  "/semicon-quiz/data/ja/q/package.json",
  "/semicon-quiz/data/ja/q/physics.json",
  "/semicon-quiz/data/ja/q/pn-junction.json",
  "/semicon-quiz/data/ja/q/power.json",
  "/semicon-quiz/data/ja/q/process-materials.json",
  "/semicon-quiz/data/ja/q/reliability.json",
  "/semicon-quiz/data/ja/q/sram-flash.json",
  "/semicon-quiz/data/ja/q/test.json",
  "/semicon-quiz/data/ja/q/wafer.json",
  "/semicon-quiz/data/ja/q/yield.json",
  "/semicon-quiz/en/",
  "/semicon-quiz/en/quiz/",
  "/semicon-quiz/en/stats/",
  "/semicon-quiz/en/manifest.json",
  "/semicon-quiz/data/en/index.json",
  "/semicon-quiz/data/en/q/adc-dac.json",
  "/semicon-quiz/data/en/q/advanced-packaging.json",
  "/semicon-quiz/data/en/q/analog.json",
  "/semicon-quiz/data/en/q/bjt.json",
  "/semicon-quiz/data/en/q/cleanroom.json",
  "/semicon-quiz/data/en/q/cmp-cleaning.json",
  "/semicon-quiz/data/en/q/compound.json",
  "/semicon-quiz/data/en/q/cpu.json",
  "/semicon-quiz/data/en/q/deposition.json",
  "/semicon-quiz/data/en/q/dram.json",
  "/semicon-quiz/data/en/q/eda.json",
  "/semicon-quiz/data/en/q/ehs.json",
  "/semicon-quiz/data/en/q/emerging-memory.json",
  "/semicon-quiz/data/en/q/epitaxy.json",
  "/semicon-quiz/data/en/q/etching.json",
  "/semicon-quiz/data/en/q/finfet.json",
  "/semicon-quiz/data/en/q/image-sensor.json",
  "/semicon-quiz/data/en/q/industry.json",
  "/semicon-quiz/data/en/q/interconnect.json",
  "/semicon-quiz/data/en/q/ion-implant.json",
  "/semicon-quiz/data/en/q/lithography.json",
  "/semicon-quiz/data/en/q/logic.json",
  "/semicon-quiz/data/en/q/mems-sensor.json",
  "/semicon-quiz/data/en/q/metrology.json",
  "/semicon-quiz/data/en/q/mosfet.json",
  "/semicon-quiz/data/en/q/oxidation.json",
  "/semicon-quiz/data/en/q/package.json",
  "/semicon-quiz/data/en/q/physics.json",
  "/semicon-quiz/data/en/q/pn-junction.json",
  "/semicon-quiz/data/en/q/power.json",
  "/semicon-quiz/data/en/q/process-materials.json",
  "/semicon-quiz/data/en/q/reliability.json",
  "/semicon-quiz/data/en/q/sram-flash.json",
  "/semicon-quiz/data/en/q/test.json",
  "/semicon-quiz/data/en/q/wafer.json",
  "/semicon-quiz/data/en/q/yield.json",
  "/semicon-quiz/js/ads.js",
  "/semicon-quiz/js/dom.js",
  "/semicon-quiz/js/glossary.js",
  "/semicon-quiz/js/level.js",
  "/semicon-quiz/js/progress.js",
  "/semicon-quiz/js/quiz.js",
  "/semicon-quiz/js/stats.js",
  "/semicon-quiz/js/store.js",
  "/semicon-quiz/js/util.js",
  "/semicon-quiz/js/modes/category.js",
  "/semicon-quiz/js/modes/exam.js",
  "/semicon-quiz/js/modes/index.js",
  "/semicon-quiz/js/modes/random.js",
  "/semicon-quiz/js/modes/review.js",
  "/semicon-quiz/js/modes/weak.js",
  "/semicon-quiz/css/style.css",
  "/semicon-quiz/icon-192.png",
  "/semicon-quiz/icon-512.png"
];

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
