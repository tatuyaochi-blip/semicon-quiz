// Service Worker の元(tools/build.js が版・保存するファイルの一覧を埋めて docs/sw.js に出力する)
// ネットワークを優先し、つながらないときだけキャッシュを使う。最初の訪問時に問題データなどを保存しておく。
const CACHE = 'sq-d99bbc06f5';
const BASE = "/";
// 各言語のトップ(長い順)。オフラインで未保存のページを開いたときは、その言語のトップを出す
const HOMES = ["/en/","/"];
const PRECACHE = [
  "/",
  "/quiz/",
  "/stats/",
  "/manifest.json",
  "/data/ja/index.json",
  "/data/ja/q/adc-dac.json",
  "/data/ja/q/advanced-packaging.json",
  "/data/ja/q/ai-stack.json",
  "/data/ja/q/analog.json",
  "/data/ja/q/bjt.json",
  "/data/ja/q/cleanroom.json",
  "/data/ja/q/cmp-cleaning.json",
  "/data/ja/q/compiler.json",
  "/data/ja/q/compound.json",
  "/data/ja/q/computer-arithmetic.json",
  "/data/ja/q/cpu.json",
  "/data/ja/q/deposition.json",
  "/data/ja/q/dram.json",
  "/data/ja/q/eda.json",
  "/data/ja/q/ehs.json",
  "/data/ja/q/embedded.json",
  "/data/ja/q/emerging-memory.json",
  "/data/ja/q/epitaxy.json",
  "/data/ja/q/etching.json",
  "/data/ja/q/finfet.json",
  "/data/ja/q/gpu-programming.json",
  "/data/ja/q/hdl-verification.json",
  "/data/ja/q/hw-security.json",
  "/data/ja/q/image-sensor.json",
  "/data/ja/q/industry.json",
  "/data/ja/q/interconnect.json",
  "/data/ja/q/io-interface.json",
  "/data/ja/q/ion-implant.json",
  "/data/ja/q/isa-assembly.json",
  "/data/ja/q/linker-loader.json",
  "/data/ja/q/lithography.json",
  "/data/ja/q/logic.json",
  "/data/ja/q/memory-hierarchy.json",
  "/data/ja/q/mems-sensor.json",
  "/data/ja/q/metrology.json",
  "/data/ja/q/mosfet.json",
  "/data/ja/q/multicore-sync.json",
  "/data/ja/q/os-hardware.json",
  "/data/ja/q/oxidation.json",
  "/data/ja/q/package.json",
  "/data/ja/q/performance.json",
  "/data/ja/q/physics.json",
  "/data/ja/q/pn-junction.json",
  "/data/ja/q/power-management.json",
  "/data/ja/q/power.json",
  "/data/ja/q/process-materials.json",
  "/data/ja/q/reliability.json",
  "/data/ja/q/sram-flash.json",
  "/data/ja/q/test.json",
  "/data/ja/q/wafer.json",
  "/data/ja/q/yield.json",
  "/en/",
  "/en/quiz/",
  "/en/stats/",
  "/en/manifest.json",
  "/data/en/index.json",
  "/data/en/q/adc-dac.json",
  "/data/en/q/advanced-packaging.json",
  "/data/en/q/ai-stack.json",
  "/data/en/q/analog.json",
  "/data/en/q/bjt.json",
  "/data/en/q/cleanroom.json",
  "/data/en/q/cmp-cleaning.json",
  "/data/en/q/compiler.json",
  "/data/en/q/compound.json",
  "/data/en/q/computer-arithmetic.json",
  "/data/en/q/cpu.json",
  "/data/en/q/deposition.json",
  "/data/en/q/dram.json",
  "/data/en/q/eda.json",
  "/data/en/q/ehs.json",
  "/data/en/q/embedded.json",
  "/data/en/q/emerging-memory.json",
  "/data/en/q/epitaxy.json",
  "/data/en/q/etching.json",
  "/data/en/q/finfet.json",
  "/data/en/q/gpu-programming.json",
  "/data/en/q/hdl-verification.json",
  "/data/en/q/hw-security.json",
  "/data/en/q/image-sensor.json",
  "/data/en/q/industry.json",
  "/data/en/q/interconnect.json",
  "/data/en/q/io-interface.json",
  "/data/en/q/ion-implant.json",
  "/data/en/q/isa-assembly.json",
  "/data/en/q/linker-loader.json",
  "/data/en/q/lithography.json",
  "/data/en/q/logic.json",
  "/data/en/q/memory-hierarchy.json",
  "/data/en/q/mems-sensor.json",
  "/data/en/q/metrology.json",
  "/data/en/q/mosfet.json",
  "/data/en/q/multicore-sync.json",
  "/data/en/q/os-hardware.json",
  "/data/en/q/oxidation.json",
  "/data/en/q/package.json",
  "/data/en/q/performance.json",
  "/data/en/q/physics.json",
  "/data/en/q/pn-junction.json",
  "/data/en/q/power-management.json",
  "/data/en/q/power.json",
  "/data/en/q/process-materials.json",
  "/data/en/q/reliability.json",
  "/data/en/q/sram-flash.json",
  "/data/en/q/test.json",
  "/data/en/q/wafer.json",
  "/data/en/q/yield.json",
  "/js/ads.js",
  "/js/course.js",
  "/js/diagnosis.js",
  "/js/dom.js",
  "/js/glossary.js",
  "/js/level.js",
  "/js/progress.js",
  "/js/quiz.js",
  "/js/stats.js",
  "/js/store.js",
  "/js/util.js",
  "/js/modes/category.js",
  "/js/modes/daily.js",
  "/js/modes/diagnosis.js",
  "/js/modes/exam.js",
  "/js/modes/index.js",
  "/js/modes/random.js",
  "/js/modes/review.js",
  "/js/modes/weak.js",
  "/css/style.css",
  "/icon-192.png",
  "/icon-512.png"
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
      .then(res => res || (e.request.mode === 'navigate' ? caches.match(HOMES.find(h => url.pathname.startsWith(h)) || BASE) : Response.error()))));
});
